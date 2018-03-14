const isUndefined = require("lodash/isUndefined");
const { BadRequestError, NotFoundError } = require("../http-errors");
const { validateContentType } = require("../utils");
const roleHandler = require("../handlers/role-handler");
const authHandler = require("../handlers/auth-handler");

const express = require("express");
const router = express.Router();

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

const validateUpdateAction = (req, res, next) => {
    const { action } = req.body;
    const { id } = req.params;
    const { customer: { orders } } = req.auth;

    const Allowed_Actions = ["cancel"];

    if (orders.includes(id) && Allowed_Actions.includes(action)) {
        return next();
    }

    return next(new BadRequestError());
};

const createOrder = (req, res, next) => {
    const { orderService, customerService } = req.services;
    const { customer } = req.auth;
    const order = {
        ...req.order,
        customerId: customer.id
    };

    return orderService.put(order).then((data) => {
        if (!customer.orders) {
            customer.orders = [];
        }

        // update customer orders
        customer.orders.push(data.id);
        return customerService.put(customer).then(() => res.send(data));
    }).catch((error) => {
        return next(error);
    });
};

const getCustomerOrders = (req, res, next) => {
    const { orderService } = req.services;
    const { customer: { orders } } = req.auth;
    return orderService.find(orders).then((items) => {
        return res.send(items);
    }).catch((error) => {
        return next(error);
    });
};

const updateOrder = (req, res, next) => {
    const { orderService } = req.services;
    const { version } = req.body;
    const { id } = req.params;
    if (id) {
        return orderService.requestCancel(id, Number(version)).then((data) => {
            if (isUndefined(data)) {
                return next(new NotFoundError("Data Not Found"));
            }

            return res.send(data);
        }).catch((error) => {
            return next(error);
        });
    }
};

/* POST create new order */
router.route("/").get(
    roleHandler("customer"),
    getCustomerOrders
).post(
    roleHandler("customer"),
    validateContentType("application/json"),
    validateOrder,
    createOrder
);

router.put("/:id", roleHandler("customer"), validateUpdateAction, updateOrder);

module.exports = {
    baseUrl: "/orders",
    router
};