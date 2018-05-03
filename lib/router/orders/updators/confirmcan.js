const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");
const { refineManageOrder } = require("../common");

module.exports = (req, res, next) => {
    const { user } = req.auth;
    const { orderService, customerService, smsService } = req.services;
    const { version } = req.body;
    const { id } = req.params;

    return orderService.confirmCancel(user, id, Number(version)).then((order) => {
        if (isUndefined(order)) {
            return next(new NotFoundError("Data Not Found"));
        }

        const warning = { message: "" };
        const smsTasks = [];

        // sms text to customer
        smsTasks.push(smsService.orderCancelled(order.mobile, order.contact, order.id)
            .catch((error) => {
                warning.message = "短信通知失败：" + error;
                console.error("Cancelled text to customer", error);
            }));

        // sms text to driver
        for (let schedule of order.schedules) {
            const smsText = {
                orderId: order.id,
                licenseNumber: schedule.licenseNumber
            };
            smsTasks.push(smsService.driverScheduleCancelled(schedule.mobile, schedule.driver, smsText)
                .catch((error) => {
                    warning.message = "短信通知失败：" + error;
                    console.error("Cancelled text to driver", error);
                }));
        }

        return Promise.all(smsTasks).then(() => {
            if (!warning.message) {
                return { order: refineManageOrder(order) };
            }

            return { warning, order: refineManageOrder(order) };
        });
    });
};