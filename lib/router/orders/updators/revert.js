const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");
const { refineManageOrder } = require("../common");

module.exports = (req, res, next) => {
    const { user } = req.auth;
    const { orderService, smsService } = req.services;
    const { version, schedule } = req.body;
    const { id } = req.params;

    return orderService.revert(user, id, Number(version), schedule).then((data) => {
        if (isUndefined(data)) {
            return next(new NotFoundError("Data Not Found"));
        }

        return refineManageOrder(data);
    });
};