const rolesHandler = require("../../handlers/roles-handler");
const userHandler = require("../../handlers/user-handler");
const { NotFoundError } = require("../../http-errors");
const express = require("express");
const router = express.Router();

const listRegister = require("./listRegister");
const confirmRegister = require("./confirmRegister");
const setup = require("./setup");

/* GET POST register */
router.get("/register", userHandler("super", "admin"), listRegister);

router.post("/register/confirm", userHandler("super", "admin"), confirmRegister);

router.post("/setup", rolesHandler("user"), setup);

router.post("/reset/password", rolesHandler("user"), setup);

// list all users
router.get("/", userHandler("super", "admin"), (req, res, next) => {
    const { userService } = req.services;
    return userService.find("users", (user) => user.actived).then((users) =>
        res.send(users)
    ).catch((error) => next(error));
});

// get a speciafied user
router.get("/:identity", userHandler("super", "admin"), (req, res, next) => {
    const { userService } = req.services;
    const { identity } = req.params;

    return userService.lookup(identity).then((user) =>
        res.send(user)
    ).catch(() => next(new NotFoundError()));
});

module.exports = {
    baseUrl: "/users",
    router
};