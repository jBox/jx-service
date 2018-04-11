const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");

module.exports = (req, res, next) => {
    const { orderService, customerService, smsService } = req.services;
    const { version } = req.body;
    const { id } = req.params;

    return orderService.confirm(id, Number(version)).then((data) => {
        if (isUndefined(data)) {
            return next(new NotFoundError("Data Not Found"));
        }

        // sms text to customer
        customerService.get(data.customerId).then((customer) =>
            smsService.orderAccepted(customer.mobile, customer.name, data.id)
        ).catch((error) => console.error(error));

        return data;
    });
};