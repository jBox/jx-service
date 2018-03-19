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
    users: null, secure: null, register: null,
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
        fs.ensureDirSync(DB_DIR);

        const USERS_DB = Path.resolve(DB_DIR, "./users");
        const USER_SEC_DB = Path.resolve(DB_DIR, "./user_secure");
        const USER_REG_DB = Path.resolve(DB_DIR, "./user_register");
        if (!db.users) {
            db.users = level(USERS_DB);
        }
        if (!db.secure) {
            db.secure = level(USER_SEC_DB);
        }
        if (!db.register) {
            db.register = level(USER_REG_DB);
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
            if (sec.actived) {
                const hash = md5(password, sec.salt);
                return hash === sec.hash;
            }

            return false;
        }).catch(() => Promise.resolve(false));
    }

    register(nickname, username, password) {
        const nameChecker = [
            db.secure.get(username).then((item) => (!item)).catch(() => Promise.resolve(true)),
            db.register.get(username).then((item) => (!item)).catch(() => Promise.resolve(true))
        ];

        return Promise.all(nameChecker).then(([secExists, regExists]) => {
            if (!secExists || !regExists) {
                return Promise.reject("用户名不合法，请联系管理员！");
            }

            const salt = uuid().replace(/-/g, "");
            const reg = {
                nickname,
                username,
                salt,
                hash: md5(password, salt),
                registerTime: new Date().toISOString()
            };

            const data = JSON.stringify(reg);
            return db.register.put(username, data).then(() => {
                return {
                    nickname,
                    username,
                    registerTime: reg.registerTime
                };
            }).catch((error) => {
                return Promise.reject(error.message);
            });
        });
    }

    create(username, role) {
        if (ROLES.indexOf(role) === -1) {
            return Promise.reject("角色不存在，请联系管理员！");
        }

        const tasks = [
            db.nextIdentity(),
            db.register.get(username).then((data) => JSON.parse(data))
        ];

        return Promise.all(tasks).then(([id, reg]) => {
            if (!reg) {
                return Promise.reject("用户名不合法，请联系管理员！");
            }

            const user = {
                id,
                nickname: reg.nickname,
                username,
                role,
                type: "register",
                actived: true,
                createTime: new Date().toISOString()
            };

            const secure = {
                id: user.id,
                username,
                salt: reg.salt,
                hash: reg.hash,
                actived: true
            };

            const data = JSON.stringify(user);
            return Promise.all([
                db.register.del(reg.username),
                db.users.put(user.id, data),
                db.secure.put(secure.username, JSON.stringify(secure))
            ]).then(() => {
                return JSON.parse(data);
            }).catch((error) => {
                console.error(error);
                db.register.put(reg.username, JSON.stringify(reg));
                db.users.del(user.id);
                db.secure.del(user.username);
                return Promise.reject(error.message);
            });
        }).catch((error) => {
            console.error(error);
            return Promise.reject(error.message);
        });
    }
}

module.exports = UserService;