const isUndefined = require("lodash/isUndefined");
const { BadRequestError, NotFoundError } = require("../http-errors");
const { validateContentType } = require("../utils");
const roleHandler = require("../handlers/role-handler");

const express = require("express");
const router = express.Router();

const validateOrder = (req, res, next) => {
    const checkMobile = (str) => (/^1\d{10}$/g.test(str));
    const createTime = new Date().toISOString();
    const order = {
        traces: [{ operator: "系统", state: "订单已生成", time: createTime }],
        vehicles: [],
        ...req.body,
        id: undefined,
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

/* POST create new order */
router.post(
    "/",
    roleHandler("customer"),
    validateContentType("application/json"),
    validateOrder,
    createOrder
);

/* GET order api */
router.get("/:id", (req, res, next) => {
    const { orderService } = req.services;
    const { id } = req.params;
    if (id) {
        return orderService.get(id).then((data) => {
            if (isUndefined(data)) {
                return next(new NotFoundError("Data Not Found"));
            }

            return res.send(data);
        }).catch((error) => {
            return next(error);
        });
    }
});

module.exports = {
    baseUrl: "/orders",
    router
};