const rolesHandler = require("../../handlers/roles-handler");
const userHandler = require("../../handlers/user-handler");
const { NotFoundError } = require("../../http-errors");
const express = require("express");
const router = express.Router();

const register = require("./register");

/* GET POST register */
router.post("/", ...register);

router.get("/verify/:identity", (req, res, next) => {
    const { userService } = req.services;
    const { identity } = req.params;

    return userService.lookup(identity).then(() =>
        res.send({ success: false })
    ).catch(() =>
        res.send({ success: true })
    )
});

module.exports = {
    baseUrl: "/register",
    router
};