const rolesHandler = require("../../handlers/roles-handler");
const userHandler = require("../../handlers/user-handler");
const { NotFoundError } = require("../../http-errors");
const express = require("express");
const router = express.Router();

const listRegister = require("./listRegister");
const confirmRegister = require("./confirmRegister");
const register = require("./register");
const verify = require("./verify");
const setup = require("./setup");

/* GET POST register */
router.route("/register")
    .get(userHandler("super", "admin"), listRegister)
    .post(...register);

router.post("/register/confirm", userHandler("super", "admin"), confirmRegister);

router.post("/setup", rolesHandler("user"), setup);

router.post("/verify", verify);

router.get("/:identity", (req, res, next) => {
    const { userService } = req.services;
    const { identity } = req.params;

    return userService.lookup(identity).then((user) =>
        res.send(user)
    ).catch(() => next(new NotFoundError()))
});

module.exports = {
    baseUrl: "/users",
    router
};