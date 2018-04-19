const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");

module.exports = (req, res, next) => {
    const { user } = req.auth;
    const { orderService } = req.services;
    const { version } = req.body;
    const { id } = req.params;

    return orderService.complete(user, id, Number(version)).then((data) => {
        if (isUndefined(data)) {
            return next(new NotFoundError("Data Not Found"));
        }

        // sms text to driver and customer

        return data;
    });
};