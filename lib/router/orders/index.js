const isUndefined = require("lodash/isUndefined");
const { BadRequestError, NotFoundError } = require("../../http-errors");
const { validateContentType } = require("../../utils");
const rolesHandler = require("../../handlers/roles-handler");
const authHandler = require("../../handlers/auth-handler");
const { ORDER_STATUS } = require("../../utils/constants");

const express = require("express");
const router = express.Router();

const createOrder = require("./createOrder");
const getOrders = require("./getOrders");
const updateOrder = require("./updateOrder");

/* GET / POST */
router.route("/").get(
    rolesHandler("customer", "user"),
    ...getOrders
).post(
    rolesHandler("customer"),
    validateContentType("application/json"),
    createOrder
);

router.get("/status", (req, res, next) => res.send(ORDER_STATUS));

router.put("/:id", rolesHandler("customer", "user"), ...updateOrder);

module.exports = {
    baseUrl: "/orders",
    router
};