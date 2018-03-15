const level = require("level");
const Path = require("path")
const fs = require("fs-extra");
const { fixNum } = require("../utils");
const { BadRequestError } = require("../http-errors");
const flow = require("../utils/order-flow");
const { ORDER_STATUS } = require("../utils/constants");

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
            if (error.notFound) {
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
            const data = JSON.stringify({ ...order, version: Date.now() });
            return db.instance.put(id, data).then(() => JSON.parse(data));
        });
    }

    find(orders) {
        if (!orders || orders.length === 0) {
            return Promise.resolve([]);
        }

        return new Promise((resolve, reject) => {
            const orderreItems = [...orders].sort((a, b) => (Number(a) - Number(b)));
            const items = {};
            const gte = orderreItems[0];
            const lte = orderreItems[orderreItems.length - 1];
            db.instance.createReadStream({ gte, lte })
                .on("data", (data) => {
                    items[data.key] = JSON.parse(data.value);
                })
                .on("error", (err) => {
                    return reject(err);
                })
                .on("end", () => {
                    const results = [];
                    for (let id of orders) {
                        results.push(items[id]);
                    }

                    resolve(results);
                });
        });
    }

    cancel(id, version) {
        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            return this.put(flow.cancel(order));
        });
    }

    confirmCancel(id, version) {
        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            return this.put(flow.confirmCancel(order));
        });
    }

    del(id, version) {
        return this.get(id).then((order) => {
            const undeletable = order.status !== ORDER_STATUS.cancelled.id && order.status !== ORDER_STATUS.completed.id;
            if (order.version !== version || undeletable) {
                return Promise.reject(new BadRequestError());
            }

            order.deleted = true;
            order.deleteTime = new Date().toISOString();
            return this.put(order);
        });
    }
}

module.exports = OrderService;