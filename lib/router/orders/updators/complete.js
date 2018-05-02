const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");
const { refineManageOrder } = require("../common");

module.exports = (req, res, next) => {
    const { user } = req.auth;
    const { orderService, smsService } = req.services;
    const { version } = req.body;
    const { id } = req.params;

    return orderService.complete(user, id, Number(version)).then((order) => {
        if (isUndefined(order)) {
            return next(new NotFoundError("Data Not Found"));
        }

        // sms text to customer
        smsService.orderCompleted(order.mobile, order.contact, order.id)
            .catch((error) => console.error("Completed text to customer", error));

        return refineManageOrder(order);
    });
};