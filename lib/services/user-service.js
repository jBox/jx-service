const level = require("level");
const Path = require("path")
const fs = require("fs-extra");
const uuid = require("uuid/v4");
const md5 = require("md5");
const { isUsernameValid, isUseridValid, validateMobileNumber } = require("../utils");
const RolesService = require("./roles-service");

const indicateIdentity = (instance) => {
    return new Promise((resolve) => {
        let key = "100000";
        return instance.createReadStream({ reverse: true, limit: 1 })
            .on("data", (data) => (key = data.key))
            .on("error", (error) => reject(error))
            .on("end", () => {
                const identity = Number(key);
                console.log(`Users indicate identity: ${identity}.`);
                resolve(identity);
            });
    });
};

const INIT_ID = Number.MIN_VALUE;

const db = {
    MAX_ID: INIT_ID,
    users: null, secure: null, register: null, mobile: null,
    nextIdentity() {
        if (db.MAX_ID > INIT_ID) {
            return Promise.resolve(++db.MAX_ID);
        }

        return indicateIdentity(db.users).then((id) => {
            if (db.MAX_ID === INIT_ID) {
                db.MAX_ID = id;
            }

            return ++db.MAX_ID;
        });
    }
};

class UserService {
    constructor(dataDir) {
        const DB_DIR = Path.resolve(dataDir, "./db");
        const USERS_DIR = Path.resolve(DB_DIR, "./users");
        fs.ensureDirSync(DB_DIR);
        fs.ensureDirSync(USERS_DIR);

        const USERS_DB = Path.resolve(USERS_DIR, "./main");
        const SEC_DB = Path.resolve(USERS_DIR, "./secure");
        const MOB_DB = Path.resolve(USERS_DIR, "./mobile");
        const REG_DB = Path.resolve(USERS_DIR, "./register");
        if (!db.users) {
            db.users = level(USERS_DB);
            indicateIdentity(db.users).then((id) => {
                if (db.MAX_ID === INIT_ID) {
                    db.MAX_ID = id;
                }
            });
        }
        if (!db.secure) {
            db.secure = level(SEC_DB);
        }
        if (!db.mobile) {
            db.mobile = level(MOB_DB);
        }
        if (!db.register) {
            db.register = level(REG_DB);
        }

        this.rolesService = new RolesService();
    }

    get(id) {
        return db.users.get(id)
            .then((data) => JSON.parse(data))
            .then((user) => {
                if (user.actived) {
                    return user;
                }

                return Promise.reject("Inactive");
            });
    }

    dispatchers() {
        return new Promise((resolve, reject) => {
            const items = [];
            db.users.createReadStream()
                .on("data", (data) => {
                    const item = JSON.parse(data.value);
                    if (item.roles.includes("dispatcher")) {
                        items.push(item);
                    }
                })
                .on("error", (err) => {
                    console.error(err);
                    resolve([]);
                })
                .on("end", () => resolve(items));
        });
    }

    lookup(identity) {
        const context = {
            type: "mobile"
        };
        if (validateMobileNumber(identity)) {
            context.executor = db.mobile.get(identity).then((data) => JSON.parse(data));
        } else if (isUseridValid(identity)) {
            context.type = "id";
            context.executor = this.get(identity);
        } else if (isUsernameValid(identity)) {
            context.type = "username";
            context.executor = db.secure.get(identity).then((data) => JSON.parse(data));
        }

        if (context.executor) {
            return context.executor.then((item) => {
                switch (context.type) {
                    case "mobile":
                    case "username":
                        return this.get(item.id);
                    default:
                        return item;
                }
            });
        }

        return Promise.reject("Not found");
    }

    find(instance, filter = (obj) => (obj)) {
        if (!db[instance]) {
            return Promise.reject("The specified instance not found.");
        }

        return new Promise((resolve, reject) => {
            const items = [];
            db[instance].createReadStream()
                .on("data", (data) => items.push(data))
                .on("error", (err) => reject(err))
                .on("end", () => {
                    const results = [];
                    for (let item of items) {
                        const obj = JSON.parse(item.value);
                        if (filter(obj)) {
                            results.push(obj);
                        }
                    }

                    resolve(results);
                });
        });
    }

    verifyUsername(username, password) {
        return db.secure.get(username).then(data => JSON.parse(data)).then((sec) => {
            const hash = md5(password, sec.salt);
            if (hash === sec.hash) {
                return this.get(sec.id);
            }

            return Promise.reject();
        });
    }

    verifyMobile(mobile) {
        return db.mobile.get(mobile).then(data => JSON.parse(data)).then((mob) => this.get(mob.id));
    }

    removeRegister(mobile) {
        const dbInstance = db.register;
        if (!dbInstance) {
            return Promise.reject("The specified instance not found.");
        }

        return dbInstance.get(mobile).then((data) => {
            const item = JSON.parse(data);
            return dbInstance.del(mobile)
                .then(() => (item))
                .catch(() => Promise.resolve(item));
        }).catch(() => {
            return Promise.reject("Mobile not found");
        });
    }

    register(nickname, mobile, username, password) {
        const traditional = true && username && password;
        const uniquenessChecker = [
            db.mobile.get(mobile).then((item) => false).catch(() => Promise.resolve(true)),
            db.register.get(mobile).then((item) => false).catch(() => Promise.resolve(true))
        ];

        if (traditional) {
            uniquenessChecker.push(db.secure.get(username).then((item) => false).catch(() => Promise.resolve(true)));
        }

        return Promise.all(uniquenessChecker).then(([validMob, validReg, validSec]) => {
            if (!validMob || !validReg) {
                return Promise.reject("手机号码不合法，请联系管理员！");
            }

            if (traditional && !validSec) {
                return Promise.reject("用户名不合法，请联系管理员！");
            }

            const reg = {
                mobile,
                nickname,
                registerTime: new Date().toISOString()
            };

            if (traditional) {
                reg.username = username;
                reg.salt = uuid().replace(/-/g, "");
                reg.hash = md5(password, reg.salt);
            }

            const data = JSON.stringify(reg);
            return db.register.put(mobile, data).then(() => {
                const newer = {
                    mobile,
                    nickname,
                    registerTime: reg.registerTime
                };
                if (traditional) {
                    newer.username = username;
                }

                return newer;
            }).catch((error) => {
                return Promise.reject(error.message);
            });
        });
    }

    createFromRegister(mobile, roles) {
        return this.create(mobile, roles, { source: "register" });
    }

    modify(user) {
        if (!Array.isArray(user.roles)) {
            return Promise.reject("角色不存在，请联系管理员！");
        }

        if (!this.rolesService.available(user.roles)) {
            return Promise.reject("角色不存在，请联系管理员！");
        }

        return this.get(user.id).then((exists) => {
            exists.timestamp = Date.now();
            exists.roles = user.roles;
            if (user.title) {
                exists.title = user.title;
            }

            const data = JSON.stringify(exists);
            return db.users.put(exists.id, data).then(() => JSON.parse(data));
        });
    }

    create(mobile, roles, options) {
        if (!this.rolesService.available(roles)) {
            return Promise.reject("角色不存在，请联系管理员！");
        }

        const { source } = options;

        const pre = [
            db.nextIdentity(),
            db.mobile.get(mobile).then(() => Promise.resolve(false)).catch(() => Promise.resolve(true))
        ];

        if (source === "manage") {
            pre.push(Promise.resolve(options.user));
        } else if (source === "register") {
            pre.push(db.register.get(mobile).then((data) => JSON.parse(data)).catch(() => Promise.resolve({})));
        }

        return Promise.all(pre).then(([id, validMobileNumber, userInfo]) => {
            if (!validMobileNumber) {
                return Promise.reject("手机号码不合法，请联系管理员！");
            }

            const user = {
                id,
                nickname: userInfo.nickname,
                mobile,
                username: userInfo.username,
                title: userInfo.title,
                roles,
                type: source,
                actived: true,
                createTime: new Date().toISOString(),
                timestamp: Date.now()
            };

            const mob = {
                id: user.id,
                mobile
            };

            const data = JSON.stringify(user);
            const tasks = [
                db.users.put(user.id, data),
                db.mobile.put(mobile, JSON.stringify(mob))
            ];

            if (userInfo.username) {
                const secure = {
                    id: user.id,
                    username: userInfo.username,
                    salt: userInfo.salt,
                    hash: userInfo.hash
                };

                tasks.push(db.secure.put(secure.username, JSON.stringify(secure)));
            }

            if (source === "register") {
                tasks.push(db.register.del(mobile));
            }

            return Promise.all(tasks).then(() => {
                return JSON.parse(data);
            }).catch((error) => {
                if (source === "register") {
                    db.register.put(mobile, JSON.stringify(userInfo));
                }

                db.users.del(user.id);
                db.mobile.del(mobile);
                if (user.username) {
                    db.secure.del(user.username);
                }

                return Promise.reject(error.message);
            });
        }).catch((error) => {
            console.error(error);
            return Promise.reject(error.message);
        });
    }

    setupUsername(userid, username, password) {
        const verifyUsername = db.secure.get(username).then(() =>
            Promise.reject("用户名已经存在")
        ).catch((error) => {
            if (error.notFound) {
                return Promise.resolve(true);
            }
            return Promise.reject(error.message);
        });

        return verifyUsername.then(() => db.users.get(userid).then(data => JSON.parse(data)).then((user) => {
            if (!user.actived) {
                return Promise.reject("用户不存在");
            }

            user.username = username;
            user.timestamp = Date.now();
            const salt = uuid().replace(/-/g, "");
            const secure = {
                id: user.id,
                username,
                salt,
                hash: md5(password, salt)
            };

            const data = JSON.stringify(user);
            const tasks = [
                db.users.put(user.id, data),
                db.secure.put(username, JSON.stringify(secure))
            ];

            return Promise.all(tasks).then(() => {
                return JSON.parse(data);
            }).catch((error) => {
                db.secure.del(username);
                db.users.put(user.id, JSON.stringify({ ...user, username: undefined }));

                return Promise.reject(error.message);
            });
        }).catch((error) => Promise.reject(error.message)));
    }

    del(id) {
        return db.users.get(id).then(data => JSON.parse(data)).then((user) => {
            const { mobile, username } = user;
            user.actived = false;
            user.mobile = null;
            user.username = null;
            user.timestamp = Date.now();
            const tasks = [
                db.users.put(user.id, JSON.stringify(user)),
                db.mobile.del(mobile)
            ];
            if (username) {
                tasks.push(db.secure.del(username));
            }

            return Promise.all(tasks).then(() => true);
        });
    }

    updateDriver(mobile, driver) {
        if (!driver.nickname || !driver.title) {
            return Promise.reject("信息不合法");
        }

        return this.lookup(mobile).then((user) => {
            if (!user.roles.includes("driver")) {
                return Promise.reject("操作不合法");
            }

            user.nickname = driver.nickname;
            user.title = driver.title;
            user.timestamp = Date.now();
            const data = JSON.stringify(user);
            return db.users.put(user.id, data).then(() => JSON.parse(data));
        });
    }

    deleteDriver(mobile) {
        return this.lookup(mobile).then((user) => {
            const roleIndex = user.roles.indexOf("driver");
            if (roleIndex === -1) {
                return Promise.reject("操作不合法");
            }

            // driver only
            if (user.roles.length === 1) {
                return this.del(user.id);
            }

            // remove driver role
            user.roles.splice(roleIndex, 1);
            user.timestamp = Date.now();
            const data = JSON.stringify(user);
            return db.users.put(user.id, data).then(() => true);
        });
    }

    updateRoles(id, roles) {
        if (!this.rolesService.available(roles)) {
            return Promise.reject("角色不存在，请联系管理员！");
        }

        return this.get(id).then((user) => {
            user.roles = roles
            user.timestamp = Date.now();
            const data = JSON.stringify(user);
            return db.users.put(user.id, data).then(() => JSON.parse(data));
        });
    }
}

module.exports = UserService;