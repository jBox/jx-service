const express = require("express");
const router = express.Router();

const baseinfo = require("./baseinfo");
const orders = require("./orders");

/* GET / PUT customer baseinfo */
router.route("/baseinfo").get(...baseinfo.get).put(...baseinfo.put);

router.route("/orders").get(...orders.list).post(...orders.create);

router.route("/orders/:id").put(...orders.update);

module.exports = {
    baseUrl: "/customers",
    router
};