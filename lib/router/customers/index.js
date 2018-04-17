const express = require("express");
const router = express.Router();

const baseinfo = require("./baseinfo");

/* GET / PUT customer baseinfo */
router.route("/baseinfo").get(...baseinfo.get).put(...baseinfo.put);

module.exports = {
    baseUrl: "/customers",
    router
};