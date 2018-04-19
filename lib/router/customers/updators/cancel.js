const isUndefined = require("lodash/isUndefined");
const { NotFoundError, BadRequestError } = require("../../../http-errors");

module.exports = (req, res, next) => {
    const { customer } = req.auth;
    const { orderService } = req.services;
    const { version } = req.body;
    const { id } = req.params;

    return orderService.cancel(customer, id, Number(version)).then((data) => {
        if (isUndefined(data)) {
            return next(new NotFoundError("Data Not Found"));
        }

        return data;
    });
};