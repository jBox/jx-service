const rolesHandler = require("../../handlers/roles-handler");
const userHandler = require("../../handlers/user-handler");
const { NotFoundError } = require("../../http-errors");
const express = require("express");
const router = express.Router();

const listRegisters = require("./listRegisters");
const listDrivers = require("./listDrivers");
const newDriver = require("./newDriver");
const confirmRegister = require("./confirmRegister");
const setup = require("./setup");

/* GET list registers */
router.get("/registers", userHandler("super", "admin"), listRegisters);

// GET list drivers
router.get("/drivers", userHandler("super", "admin"), listDrivers);

// POST new driver
router.post("/drivers", userHandler("super", "admin"), ...newDriver);

router.post("/registers/confirm", userHandler("super", "admin"), confirmRegister);

router.post("/setup", rolesHandler("user"), setup);

router.post("/reset/password", rolesHandler("user"), setup);

// list all users
router.get("/", userHandler("super", "admin"), (req, res, next) => {
    const { userService } = req.services;
    const sources = ["register", "manage"];
    const filter = (user) => user.actived && sources.includes(user.type);
    return userService.find("users", filter).then((users) =>
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