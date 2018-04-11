const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");

module.exports = (req, res, next) => {
    const { orderService, customerService, smsService } = req.services;
    const { version, order } = req.body;
    const { id } = req.params;

    return orderService.modify(id, Number(version), order).then((data) => {
        if (isUndefined(data)) {
            return next(new NotFoundError("Data Not Found"));
        }

        // sms text to driver and customer

        return data;
    });
};