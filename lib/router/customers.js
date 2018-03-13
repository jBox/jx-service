const isUndefined = require("lodash/isUndefined");
const { BadRequestError, NotFoundError } = require("../http-errors");
const { validateContentType } = require("../utils");

const express = require("express");
const router = express.Router();

/* POST new customer */
router.post("/", validateContentType("application/json"), (req, res, next) => {
    const { customerService } = req.services;
    const customer = {
        name: "小雅",
        id: "109123847015",
        ...req.body
    };

    return customerService.put(customer).then((data) => {
        return res.send(data);
    }).catch((error) => {
        return next(error);
    });
});

/* GET get customer by id */
router.get("/:id", (req, res, next) => {
    const { customerService } = req.services;
    const { id } = req.params;

    return customerService.get(id).then((customer) => {
        if (!customer) {
            return next(new NotFoundError("Data Not Found"));
        }

        return res.send(customer);
    }).catch((error) => {
        return next(error);
    });
});

module.exports = {
    baseUrl: "/customers",
    router
};