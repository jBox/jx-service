const rolesHandler = require("../../handlers/roles-handler");
const userHandler = require("../../handlers/user-handler");
const { BadRequestError } = require("../../http-errors");
const express = require("express");
const router = express.Router();

const listRegister = require("./listRegister");
const confirmRegister = require("./confirmRegister");
const register = require("./register");
const verify = require("./verify");
const setup = require("./setup");
const mob = require("./mob");

/* GET POST register */
router.route("/register")
    .get(userHandler("super", "admin"), listRegister)
    .post(...register);

router.post("/register/confirm", userHandler("super", "admin"), confirmRegister);

router.post("/setup", rolesHandler("user"), setup);

router.get("/mob/:mobile", mob);

router.post("/verify", verify);

module.exports = {
    baseUrl: "/users",
    router
};