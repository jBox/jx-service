const OrderService = require("./order-service");
const CustomerService = require("./customer-service");
const UserService = require("./user-service");
const OAuthService = require("./oauth-service");

module.exports = (dataDir) => {
    const services = {
        DATA_DIR: dataDir,
        orderService: new OrderService(dataDir),
        customerService: new CustomerService(dataDir),
        userService: new UserService(dataDir),
        oauthService: new OAuthService()
    };

    return (req, res, next) => {
        req.services = services;
        next();
    };
};