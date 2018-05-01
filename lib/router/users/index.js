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
const updateDriver = require("./updateDriver");
const deleteDriver = require("./deleteDriver");
const addUserRole = require("./addUserRole");
const removeUserRole = require("./removeUserRole");

/* GET list registers */
router.get("/registers", userHandler("super", "admin"), listRegisters);

// GET / POST drivers
router.route("/drivers")
    .get(userHandler("super", "admin"), listDrivers)
    .post(userHandler("super", "admin"), ...newDriver);

// PUT / DELETE drivers
router.route("/drivers/:mobile")
    .put(userHandler("super", "admin"), updateDriver)
    .delete(userHandler("super", "admin"), deleteDriver);

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

// list user's info
router.get("/userinfo", rolesHandler("user"), (req, res, next) => {
    const { user } = req.auth;
    return res.send({
        username: user.username,
        nickname: user.nickname,
        mobile: user.mobile,
        title: user.title,
        roles: user.roles,
        createTime: user.createTime
    });
});

// get a speciafied user
router.get("/:identity", userHandler("super", "admin"), (req, res, next) => {
    const { userService } = req.services;
    const { identity } = req.params;

    return userService.lookup(identity).then((user) =>
        res.send(user)
    ).catch(() => next(new NotFoundError()));
});

// delete a speciafied user
router.delete("/:identity", userHandler("super", "admin"), (req, res, next) => {
    const { userService } = req.services;
    const { identity } = req.params;

    return userService.del(identity).then(() =>
        res.send()
    ).catch((error) => next(error));
});

// update user Roles
router.route("/:identity/roles/:role")
.post(userHandler("super", "admin"), addUserRole)
.delete(userHandler("super", "admin"), removeUserRole);

module.exports = {
    baseUrl: "/users",
    router
};