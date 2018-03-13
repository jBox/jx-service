const level = require("level");
const Path = require("path")
const fs = require("fs-extra");

const db = { instance: null };

class UserService {
    constructor(dataDir) {
        const DB_DIR = Path.resolve(dataDir, "./db");
        fs.ensureDirSync(DB_DIR);

        const USERS_DB = Path.resolve(DB_DIR, "./users");
        if (!db.instance) {
            db.instance = level(USERS_DB);
        }
    }

    get(id) {
        const order = db.instance.get(id).then((data) => JSON.parse(data));
        return order.catch((error) => {
            if (/^notfounderror/ig.test(error.type)) {
                return Promise.resolve();
            }

            return Promise.reject(error);
        });
    }

    put(user) {
        if (!user.id) {
            return Promise.reject(new Error("Customer id is missing."));
        }

        const data = JSON.stringify(user);
        return db.instance.put(user.id, data).then(() => JSON.parse(data));
    }
}

module.exports = UserService;