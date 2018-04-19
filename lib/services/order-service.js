const level = require("level");
const Path = require("path")
const fs = require("fs-extra");
const { fixNum } = require("../utils");
const { BadRequestError } = require("../http-errors");
const OrderFlow = require("../utils/order-flow");
const { ORDER_STATUS, ORDER_EDITABLE_FIELDS, ORDER_SERVICE } = require("../utils/constants");

const indicateIdentity = (instance) => {
    return new Promise((resolve, reject) => {
        let key = "00000000000000";
        return instance.createReadStream({ reverse: true, limit: 1 })
            .on("data", (data) => (key = data.key))
            .on("error", (error) => reject(error))
            .on("end", () => {
                const identity = Number(key.substr(8));
                console.log(`Orders indicate identity: ${identity}.`);
                resolve(identity);
            });
    });
};

const INIT_ID = -1;

const db = {
    MAX_ID: INIT_ID,
    instance: null,
    nextIdentity() {
        if (db.MAX_ID > INIT_ID) {
            return Promise.resolve(++db.MAX_ID);
        }

        return indicateIdentity(db.instance).then((id) => {
            if (db.MAX_ID === INIT_ID) {
                db.MAX_ID = id;
            }

            return ++db.MAX_ID;
        });
    },
    generateOrderId(identity) {
        const now = new Date();
        const timeline = `${now.getFullYear()}${fixNum(now.getMonth() + 1, 2)}${fixNum(now.getDate(), 2)}`;
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
            indicateIdentity(db.instance).then((id) => {
                if (db.MAX_ID === INIT_ID) {
                    db.MAX_ID = id;
                }
            });
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

    find(orders, filter) {
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
                .on("error", (err) => reject(err))
                .on("end", () => {
                    const results = [];
                    for (let id of orders) {
                        const item = items[id];
                        if (filter(item)) {
                            results.push(item);
                        }
                    }

                    resolve(results);
                });
        });
    }

    lookup(filter, take = 5, next = null) {
        return new Promise((resolve, reject) => {
            const results = {
                active: !next,
                items: [],
                next: null
            };
            const lookupOptions = { reverse: true };
            if (next) {
                lookupOptions.lte = next;
            }
            db.instance.createReadStream(lookupOptions)
                .on("data", (data) => {
                    if (!results.active) {
                        results.active = (next === data.key);
                    }

                    if (results.active && results.items.length < take) {
                        const item = JSON.parse(data.value);
                        if (filter(item)) {
                            results.items.push(item);
                        }
                    } else if (results.active && results.items.length === take && !results.next) {
                        results.next = data.key;
                    }
                })
                .on("error", (err) => reject(err))
                .on("end", () => resolve({ data: results.items, next: results.next }));
        });
    }

    cancel(user, id, version, exec) {
        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            const flow = new OrderFlow(order);
            return this.put(exec ? flow.confirmCancel(user) : flow.cancel(user));
        });
    }

    confirmCancel(user, id, version) {
        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            const flow = new OrderFlow(order);
            return this.put(flow.confirmCancel(user));
        });
    }

    confirm(user, id, version) {
        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            const flow = new OrderFlow(order);
            return this.put(flow.confirm(user));
        });
    }

    schedule(user, id, version, schedule) {
        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            const flow = new OrderFlow(order);
            return this.put(flow.schedule(user, schedule.vehicle.number, schedule.driver));
        });
    }

    depart(user, id, version) {
        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            const flow = new OrderFlow(order);
            return this.put(flow.depart(user));
        });
    }

    revert(user, id, version) {
        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            const flow = new OrderFlow(order);
            return this.put(flow.revert(user));
        });
    }

    complete(user, id, version) {
        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            const flow = new OrderFlow(order);
            return this.put(flow.complete(user));
        });
    }

    modify(id, version, data) {
        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            // modify
            order = ORDER_EDITABLE_FIELDS.reduce((obj, field) => {
                if (data.hasOwnProperty(field)) {
                    obj[field] = data[field];
                }

                return obj;
            }, { ...order });

            return this.put(order);
        });
    }

    del(id, version) {
        return this.get(id).then((order) => {
            const deletable = order.service.status === ORDER_SERVICE.cancelled.id ||
                order.status === ORDER_STATUS.completed.id;

            if (order.version !== version || !deletable) {
                return Promise.reject(new BadRequestError());
            }

            order.deleted = true;
            order.deleteTime = new Date().toISOString();
            return this.put(order);
        });
    }
}

module.exports = OrderService;