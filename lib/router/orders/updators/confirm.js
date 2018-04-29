const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");
const { refineManageOrder } = require("../common");

module.exports = (req, res, next) => {
    const { user } = req.auth;
    const { orderService, smsService } = req.services;
    const { version } = req.body;
    const { id } = req.params;

    return orderService.confirm(user, id, Number(version)).then((data) => {
        if (isUndefined(data)) {
            return next(new NotFoundError("Data Not Found"));
        }

        // sms text to customer
        smsService.orderAccepted(data.mobile, data.name, data.id);

        return refineManageOrder(data);
    });
};