const isUndefined = require("lodash/isUndefined");
const { NotFoundError, BadRequestError } = require("../../http-errors");
const updators = require("./updators");

const validateUpdateOperation = (req, res, next) => {
    const { customer } = req.auth;
    if (customer) {
        return customerOperation(req, res, next);
    }

    return next(new BadRequestError());
};

const customerOperation = (req, res, next) => {
    const { operation } = req.body;
    const { id } = req.params;
    const { customer: { orders } } = req.auth;

    const Allowed_Operations = ["cancel", "del"];

    if (orders.includes(id) && Allowed_Operations.includes(operation)) {
        return next();
    }

    return next(new BadRequestError());
};

const update = (req, res, next) => {
    const { operation } = req.body;
    return updators.get(operation).update(req, res, next).then((data) => {
        return res.send(data);
    }).catch((error) => {
        return next(error);
    });
};

module.exports = [validateUpdateOperation, update];