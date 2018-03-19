const { BadRequestError } = require("../http-errors");
const { validateContentType } = require("../utils");
const rolesHandler = require("../handlers/roles-handler");

const express = require("express");
const router = express.Router();

/* GET / PUT customer baseinfo */
router.route("/baseinfo")
    .get(rolesHandler("customer"), (req, res, next) => {
        const { customer } = req.auth;
        return res.send({
            name: customer.name,
            mobile: customer.mobile,
            address: customer.address
        });
    })
    .put(rolesHandler("customer"), validateContentType("application/json"), (req, res, next) => {
        const checkMobile = (str) => (/^1\d{10}$/g.test(str));
        const { customerService } = req.services;
        const { customer } = req.auth;

        const baseinfo = {
            name: req.body.name,
            mobile: req.body.mobile,
            address: req.body.address
        };

        if (baseinfo.name && baseinfo.address && checkMobile(baseinfo.mobile)) {
            return customerService.put({ ...customer, ...baseinfo }).then(() =>
                res.send(baseinfo)
            );
        }

        return next(new BadRequestError());
    });

module.exports = {
    baseUrl: "/customers",
    router
};