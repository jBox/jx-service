const isUndefined = require("lodash/isUndefined");
const { BadRequestError, NotFoundError } = require("../../http-errors");
const { validateContentType } = require("../../utils");
const roleHandler = require("../../handlers/role-handler");
const authHandler = require("../../handlers/auth-handler");

const express = require("express");
const router = express.Router();

const createOrder = require("./createOrder");
const getCustomerOrders = require("./getCustomerOrders");
const updateOrder = require("./updateOrder");

const validateOrder = (req, res, next) => {
    const checkMobile = (str) => (/^1\d{10}$/g.test(str));
    const createTime = new Date().toISOString();
    const order = {
        vehicles: [],
        ...req.body,
        id: undefined,
        status: "submit",
        traces: [{ operator: "系统", state: "订单已生成", time: createTime }],
        createTime
    };

    let isValid = true &&
        order.name &&
        order.departureTime &&
        order.departurePlace &&
        order.destination;

    if (isValid && !checkMobile(order.mobile)) {
        isValid = false;
    }

    if (isValid && order.duration <= 0) {
        isValid = false;
    }

    if (isValid) {
        req.order = order;
        return next();
    }

    return next(new BadRequestError("Order is invalid."));
};

const validateUpdateOperation = (req, res, next) => {
    const { operation } = req.body;
    const { id } = req.params;
    const { customer: { orders } } = req.auth;

    const Allowed_Operations = ["cancel", "delete"];

    if (orders.includes(id) && Allowed_Operations.includes(operation)) {
        return next();
    }

    return next(new BadRequestError());
};

/* GET / POST */
router.route("/")
    .get(
        roleHandler("customer"),
        getCustomerOrders
    ).post(
        roleHandler("customer"),
        validateContentType("application/json"),
        validateOrder,
        createOrder
    );

router.put("/:id", roleHandler("customer"), validateUpdateOperation, updateOrder);

module.exports = {
    baseUrl: "/orders",
    router
};