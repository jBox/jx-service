const level = require("level");
const Path = require("path")
const fs = require("fs-extra");
const { BadRequestError } = require("../http-errors");

const db = {
    instance: null,
    nextIdentity() {
        return new Promise((resolve) => {
            let key = "0";
            db.instance.createReadStream({ reverse: true, limit: 1 })
                .on("data", (data) => (key = data.key))
                .on("end", () => {
                    const identity = Number(key);
                    resolve(`${identity + 1}`);
                });
        });
    }
};

class VehicleService {
    constructor(dataDir) {
        const DB_DIR = Path.resolve(dataDir, "./db");
        fs.ensureDirSync(DB_DIR);

        const VEHICLES_DB = Path.resolve(DB_DIR, "./vehicles");
        if (!db.instance) {
            db.instance = level(VEHICLES_DB);
        }
    }

    get(id) {
        const item = db.instance.get(id).then((data) => JSON.parse(data));
        return item.catch((error) => {
            if (error.notFound) {
                return Promise.resolve();
            }

            return Promise.reject(error);
        });
    }

    put(vehicle) {
        const vehicleId = vehicle.id ?
            Promise.resolve(vehicle.id) :
            db.nextIdentity();

        return vehicleId.then((id) => {
            return this.get(id).then((item) => {
                if (item && item.version !== vehicle.version) {
                    return Promise.reject(new BadRequestError());
                }

                return id;
            }).then((id) => {
                const data = JSON.stringify({ ...vehicle, id, version: Date.now() });
                return db.instance.put(id, data).then(() => JSON.parse(data));
            });
        });
    }

    find(filter = () => true) {
        return new Promise((resolve, reject) => {
            const items = [];
            db.instance.createValueStream()
                .on("data", (data) => {
                    const item = JSON.parse(data);
                    if (filter(item)) {
                        items.push(item);
                    }
                })
                .on("error", (err) => reject(err))
                .on("end", () => resolve(items));
        });
    }

    del(id) {
        return db.instance.del(id).then(() => true);
    }
}

module.exports = VehicleService;