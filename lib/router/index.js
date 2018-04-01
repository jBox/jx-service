const express = require("express");
const errorHandler = require("../handlers/error-handler");
const { NotFoundError } = require("../http-errors");
const services = require("../services");
const xAuth = require("../middlewares/xAuth");

const roles = require("./roles");
const orders = require("./orders");
const customers = require("./customers");
const oauth = require("./oauth");
const vehicles = require("./vehicles");
const users = require("./users");
const captchas = require("./captchas");
const register = require("./register");

module.exports = (dataDir, logger) => {
    const router = express.Router();

    // services middlewares
    router.use(services(dataDir));

    // other middlewares
    router.use(xAuth);

    const routes = [roles, orders, customers, oauth, vehicles, users, captchas, register];
    for (let route of routes) {
        router.use(route.baseUrl, route.router);
    }

    // 404
    router.use((req, res, next) => next(new NotFoundError()));

    // services middlewares
    router.use(errorHandler(logger));

    return router;
};
