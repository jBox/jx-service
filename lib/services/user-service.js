const level = require("level");
const Path = require("path")
const fs = require("fs-extra");
const uuid = require("uuid/v4");
const md5 = require("md5");

const ROLES = [
    "admin",
    "driver"
];

const db = {
    users: null, secure: null, register: null, mobile: null,
    nextIdentity() {
        return new Promise((resolve) => {
            let key = "10000";
            db.users.createReadStream({ reverse: true, limit: 1 })
                .on("data", (data) => (key = data.key))
                .on("end", () => {
                    const identity = Number(key);
                    resolve(`${identity + 1}`);
                });
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
    }

    get(id) {
        const user = db.users.get(id)
            .then((data) => JSON.parse(data))
            .then((user) => user.actived ? user : undefined);
        return user.catch((error) => {
            if (error.notFound) {
                return Promise.resolve();
            }

            return Promise.reject(error.message);
        });
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

    verify(username, password) {
        return db.secure.get(username).then(data => JSON.parse(data)).then((sec) => {
            const hash = md5(password, sec.salt);
            return hash === sec.hash;
        }).catch(() => Promise.resolve(false));
    }

    mob(mobile) {
        return db.mobile.get(mobile).then(data => JSON.parse(data)).then(() => true).catch(() => Promise.resolve(false));
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

            const salt = uuid().replace(/-/g, "");
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

    create(mobile, role) {
        if (ROLES.indexOf(role) === -1) {
            return Promise.reject("角色不存在，请联系管理员！");
        }

        const pre = [
            db.nextIdentity(),
            db.register.get(mobile).then((data) => JSON.parse(data))
        ];

        return Promise.all(pre).then(([id, reg]) => {
            if (!reg) {
                return Promise.reject("手机号码不合法，请联系管理员！");
            }

            const user = {
                id,
                nickname: reg.nickname,
                mobile,
                username: reg.username,
                role,
                type: "register",
                actived: true,
                createTime: new Date().toISOString()
            };

            const mob = {
                id: user.id,
                mobile
            };

            const data = JSON.stringify(user);
            const tasks = [
                db.register.del(mobile),
                db.users.put(user.id, data),
                db.mobile.put(mobile, JSON.stringify(mob))
            ];

            if (reg.username) {
                const secure = {
                    id: user.id,
                    username: reg.username,
                    salt: reg.salt,
                    hash: reg.hash
                };

                tasks.push(db.secure.put(secure.username, JSON.stringify(secure)));
            }

            return Promise.all(tasks).then(() => {
                return JSON.parse(data);
            }).catch((error) => {
                db.register.put(mobile, JSON.stringify(reg));
                db.users.del(user.id);
                db.mobile.del(mobile);
                if (user.username) {
                    db.secure.del(user.username);
                }

                return Promise.reject(error);
            });
        }).catch((error) => {
            console.error(error);
            return Promise.reject(error.message);
        });
    }

    setupUsername(userid, username, password) {
        const verifyUsername = db.secure.get(username).then(() =>
            Promise.reject({ message: "用户名已经存在" })
        ).catch((error) => {
            if (error.notFound) {
                return Promise.resolve(true);
            }
            return Promise.reject(error);
        });

        return verifyUsername.then(() => db.users.get(userid).then(data => JSON.parse(data)).then((user) => {
            if (!user.actived) {
                return Promise.reject({ message: "用户不存在" });
            }

            user.username = username;
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

                return Promise.reject(error);
            });
        }).catch((error) => Promise.reject(error.message)));
    }

    del(id) {
        return db.users.get(id).then(data => JSON.parse(data)).then((user) => {
            const { mobile, username } = user;
            user.actived = false;
            user.mobile = null;
            user.username = null;
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
}

module.exports = UserService;