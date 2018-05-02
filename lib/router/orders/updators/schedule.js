const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");
const { refineManageOrder } = require("../common");

module.exports = (req, res, next) => {
    const { user } = req.auth;
    const { orderService, customerService, smsService } = req.services;
    const { version, schedules } = req.body;
    const { id } = req.params;

    return orderService.schedule(user, id, Number(version), schedules).then((order) => {
        if (isUndefined(order)) {
            return next(new NotFoundError("Data Not Found"));
        }

        // sms text to customer
        smsService.orderScheduled(order.mobile, order.contact, { orderId: order.id })
            .catch((error) => console.error("Scheduled text to customer", error));

        for (let schedule of order.schedules) {
            // sms text to driver            
            const smsText = {
                orderId: order.id,
                licenseNumber: schedule.licenseNumber
            };
            smsService.driverScheduled(schedule.mobile, schedule.driver, smsText)
                .catch((error) => console.error("Scheduled text to driver", error));
        }

        return refineManageOrder(order);
    });
};