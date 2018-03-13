const OrderService = require("./order-service");
const CustomerService = require("./customer-service");
const UserService = require("./user-service");

module.exports = (dataDir) => {
    const services = {
        DATA_DIR: dataDir,
        orderService: new OrderService(dataDir),
        customerService: new CustomerService(dataDir),
        userService: new UserService(dataDir)
    };

    return (req, res, next) => {
        req.services = services;
        next();
    };
};