const { MODELS } = require("../utils/constants");

const express = require("express");
const router = express.Router();

/* GET models */
router.get("/models", (req, res, next) => res.send(MODELS));

module.exports = {
    baseUrl: "/vehicles",
    router
};