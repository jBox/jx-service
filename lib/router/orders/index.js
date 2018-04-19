const userHandler = require("../../handlers/user-handler");
const { ORDER_STATUS } = require("../../utils/constants");

const express = require("express");
const router = express.Router();

const getOrders = require("./getOrders");
const getOrder = require("./getOrder");
const updateOrder = require("./updateOrder");

/* GET */
router.get("/", userHandler("admin", "super"), ...getOrders)

router.get("/status", (req, res, next) => res.send(ORDER_STATUS));

router.route("/:id")
    .get(userHandler("admin", "super"), ...getOrder)
    .put(userHandler("admin", "super"), ...updateOrder);

module.exports = {
    baseUrl: "/orders",
    router
};