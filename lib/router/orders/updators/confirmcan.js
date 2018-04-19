const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");

module.exports = (req, res, next) => {
    const { user } = req.auth;
    const { orderService, customerService, smsService } = req.services;
    const { version } = req.body;
    const { id } = req.params;

    return orderService.confirmCancel(user, id, Number(version)).then((data) => {
        if (isUndefined(data)) {
            return next(new NotFoundError("Data Not Found"));
        }

        // sms text to customer
        smsService.orderCancelledor(data.mobile, data.name, data.id);

        // sms text to driver
        if (data.schedule) {
            const schedule = data.schedule;
            const dateFrom = new Date(data.departureTime);
            const dateTo = new Date(data.departureTime);
            dateTo.setDate(dateTo.getDate() + Number(data.duration));
            const smsText = {
                dateFrom: dateFrom.format("MM-dd hh:mm"),
                dateTo: dateTo.format("MM-dd"),
                licenseNum: schedule.license
            };

            smsService.driverScheduleCancelled(schedule.driver.mobile, smsText);
        }

        return data;
    });
};