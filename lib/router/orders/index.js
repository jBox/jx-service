const isUndefined = require("lodash/isUndefined");
const { BadRequestError, NotFoundError } = require("../../http-errors");
const { validateContentType } = require("../../utils");
const roleHandler = require("../../handlers/role-handler");
const authHandler = require("../../handlers/auth-handler");
const { ORDER_STATUS } = require("../../utils/constants");

const express = require("express");
const router = express.Router();

const createOrder = require("./createOrder");
const getCustomerOrders = require("./getCustomerOrders");
const updateOrder = require("./updateOrder");

/* GET / POST */
router.route("/")
    .get(
        roleHandler("customer"),
        getCustomerOrders
    ).post(
        roleHandler("customer"),
        validateContentType("application/json"),
        createOrder
    );

router.get("/status", (req, res, next) => res.send(ORDER_STATUS));

router.put("/:id", roleHandler("customer"), ...updateOrder);

module.exports = {
    baseUrl: "/orders",
    router
};