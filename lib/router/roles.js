const express = require("express");
const router = express.Router();

/* GET roles */
router.get("/", (req, res, next) => {
    const { rolesService } = req.services;
    return res.send(rolesService.roles());
});

module.exports = {
    baseUrl: "/roles",
    router
};