const level = require("level");
const Path = require("path")
const fs = require("fs-extra");

const db = { instance: null };

class CustomerService {
    constructor(dataDir) {
        const DB_DIR = Path.resolve(dataDir, "./db");
        fs.ensureDirSync(DB_DIR);

        const CUSTOMERS_DB = Path.resolve(DB_DIR, "./customers");
        if (!db.instance) {
            db.instance = level(CUSTOMERS_DB);
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

    put(customer) {
        if (!customer.id) {
            return Promise.reject(new Error("Customer id is missing."));
        }

        const data = JSON.stringify(customer);
        return db.instance.put(customer.id, data).then(() => JSON.parse(data));
    }

    department(id, department) {
        return this.get(id).then((customer) => {
            if (department) {
                // set department
                customer.department = department;
                return this.put(customer).then(() => department);
            } else {
                return customer.department;
            }
        }).catch(() => Promise.resolve(""));
    }
}

module.exports = CustomerService;