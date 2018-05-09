const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");
const { refineManageOrder } = require("../common");

module.exports = (req, res, next) => {
    const { user } = req.auth;
    const { orderService, smsService, customerService } = req.services;
    const { version, department } = req.body;
    const { id } = req.params;

    return orderService.confirm(user, id, Number(version), department).then((order) => {
        if (isUndefined(order)) {
            return next(new NotFoundError("Data Not Found"));
        }

        if (department) {
            customerService.department(order.customerId, order.department);
        }

        const warning = { message: "" };

        // sms text to customer
        const smsTask = smsService.orderAccepted(order.mobile, order.contact, order.id)
            .catch((error) => {
                warning.message = "短信通知失败：" + error;
                console.error("Accepted text to customer", error);
            });

        return smsTask.then(() => {
            if (!warning.message) {
                return { order: refineManageOrder(order) };
            }

            return { warning, order: refineManageOrder(order) };
        });
    });
};