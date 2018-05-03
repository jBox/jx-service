const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");
const { refineManageOrder } = require("../common");

module.exports = (req, res, next) => {
    const { user } = req.auth;
    const { orderService, smsService } = req.services;
    const { version, schedule } = req.body;
    const { id } = req.params;

    return orderService.progress(user, id, Number(version), schedule, schedule.progress).then((order) => {
        if (isUndefined(order)) {
            return next(new NotFoundError("Data Not Found"));
        }

        return { order: refineManageOrder(order) };
    });
};