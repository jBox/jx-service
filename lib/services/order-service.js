const level = require("level");
const Path = require("path")
const fs = require("fs-extra");
const { fixNum } = require("../utils");

const db = {
    instance: null,
    nextIdentity() {
        return new Promise((resolve) => {
            let key = "00000000000000";
            db.instance.createReadStream({ reverse: true, limit: 1 })
                .on("data", (data) => (key = data.key))
                .on("end", () => {
                    const identity = Number(key.substr(8));
                    resolve(`${identity + 1}`);
                });
        });
    },
    generateOrderId(identity) {
        const now = new Date();
        const timeline = `${now.getFullYear()}${fixNum(now.getMonth() + 1, 2)}${now.getDate()}`;
        return `${timeline}${fixNum(identity, 6)}`;
    }
};

class OrderService {
    constructor(dataDir) {
        const DB_DIR = Path.resolve(dataDir, "./db");
        fs.ensureDirSync(DB_DIR);

        const ORDERS_DB = Path.resolve(DB_DIR, "./orders");
        if (!db.instance) {
            db.instance = level(ORDERS_DB);
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

    put(order) {
        const orderId = order.id ?
            Promise.resolve(order.id) :
            db.nextIdentity().then((identity) => {
                order.id = db.generateOrderId(identity);
                return order.id;
            });

        return orderId.then((id) => {
            const data = JSON.stringify(order);
            return db.instance.put(id, data).then(() => JSON.parse(data));
        });
    }
}

module.exports = OrderService;