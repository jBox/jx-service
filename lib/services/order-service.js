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
    schedules: null,
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
        const SCHEDULES_DB = Path.resolve(DB_DIR, "./schedules");
        if (!db.instance) {
            db.instance = level(ORDERS_DB);
            indicateIdentity(db.instance).then((id) => {
                if (db.MAX_ID === INIT_ID) {
                    db.MAX_ID = id;
                }
            });
        }
        if (!db.schedules) {
            db.schedules = level(SCHEDULES_DB);
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

    all(filter) {
        if (!filter) {
            filter = (item) => !item.deleted;
        }

        return new Promise((resolve, reject) => {
            const items = [];
            db.instance.createReadStream()
                .on("data", (data) => {
                    if (data.value) {
                        let item = JSON.parse(data.value);
                        if (filter(item)) {
                            items.push(item);
                        }
                    }
                })
                .on("error", (err) => reject(err))
                .on("end", () => resolve(items));
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

    schedule(user, id, version, data) {
        /*[{id,licenseNumber, model, driver, mobile}]*/
        const schedules = data.reduce((items, item) => {
            if (item.belongs && item.licenseNumber && item.mobile) {
                return items.concat({
                    id: item.id,
                    belongs: item.belongs,
                    licenseNumber: item.licenseNumber,
                    model: item.model,
                    driver: item.driver,
                    mobile: item.mobile,
                    progress: []
                });
            }

            return items;
        }, []);

        if (schedules.length === 0) {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError("无效的出车安排"));
            }
        }

        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            const flow = new OrderFlow(order);
            const scheduled = flow.schedule(user, schedules);
            const scheduleUpdates = [];
            for (let key of Object.keys(scheduled.updates)) {
                const value = scheduled.updates[key];
                if (value === null) {
                    scheduleUpdates.push({ type: "del", key });
                } else {
                    scheduleUpdates.push({ type: "put", key, value: JSON.stringify(value) });
                }
            }

            const data = JSON.stringify({ ...scheduled.order, version: Date.now() });
            const tasks = [db.instance.put(scheduled.order.id, data).then(() => JSON.parse(data))];
            if (scheduleUpdates.length > 0) {
                tasks.push(db.schedules.batch(scheduleUpdates));
            }

            return Promise.all(tasks).then(([updatedOrder]) => updatedOrder);
        });
    }

    driverSchedules(mobile) {
        return new Promise((resolve, reject) => {
            const results = [];
            db.schedules.createReadStream()
                .on("data", (data) => {
                    const key = data.key.substr(0, 11);
                    if (key === mobile) {
                        results.push(JSON.parse(data.value));
                    }
                })
                .on("error", (err) => reject(err))
                .on("end", () => resolve(results));
        });
    }

    depart(user, id, version, schedule) {
        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            const flow = new OrderFlow(order);
            return this.put(flow.depart(user, schedule));
        });
    }

    revert(user, id, version, schedule) {
        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            const flow = new OrderFlow(order);
            const revertedOrder = flow.revert(user, schedule);
            const data = JSON.stringify({ ...revertedOrder, version: Date.now() });
            const tasks = [
                db.instance.put(revertedOrder.id, data).then(() => JSON.parse(data)),
                db.schedules.del(`${user.mobile}${revertedOrder.id}`)
            ];

            return Promise.all(tasks).then(([updatedOrder]) => updatedOrder);
        });
    }

    progress(user, id, version, schedule, progress) {
        return this.get(id).then((order) => {
            if (order.version !== version) {
                return Promise.reject(new BadRequestError());
            }

            const flow = new OrderFlow(order);
            return this.put(flow.progress(user, schedule, progress));
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

            if (order.schedules.length > 0 && order.schedules.some((x) => !!x.status)) {
                return Promise.reject(new BadRequestError("此订单不可修改"));
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