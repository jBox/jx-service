const isUndefined = require("lodash/isUndefined");
const { NotFoundError, BadRequestError } = require("../../../http-errors");
const { refineManageOrder } = require("../common");

module.exports = (req, res, next) => {
    const { user } = req.auth;
    const { orderService, customerService, smsService } = req.services;
    const { version } = req.body;
    const { id } = req.params;

    return orderService.cancel(user, id, Number(version), true).then((order) => {
        if (isUndefined(order)) {
            return next(new NotFoundError("Data Not Found"));
        }

        // sms text to customer
        smsService.orderCancelled(order.mobile, order.contact, order.id)
            .catch((error) => console.error("Cancelled text to customer", error));

        // sms text to driver
        for (let schedule of order.schedules) {
            const smsText = {
                orderId: order.id,
                licenseNumber: schedule.licenseNumber
            };
            smsService.driverScheduleCancelled(schedule.mobile, schedule.driver, smsText)
                .catch((error) => console.error("Cancelled text to driver", error));
        }

        return refineManageOrder(order);
    });
};