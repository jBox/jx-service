const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");

module.exports = (req, res, next) => {
    const { user } = req.auth;
    const { orderService, customerService, smsService } = req.services;
    const { version, schedule, order } = req.body;
    const { id } = req.params;

    return orderService.schedule(user, id, Number(version), schedule).then((data) => {
        if (isUndefined(data)) {
            return next(new NotFoundError("Data Not Found"));
        }

        const dateFrom = new Date(data.departureTime);
        const dateTo = new Date(data.departureTime);
        dateTo.setDate(dateTo.getDate() + Number(data.duration));
        const smsText = {
            dateFrom: dateFrom.format("MM-dd hh:mm"),
            dateTo: dateTo.format("MM-dd"),
            departure: data.departurePlace,
            destination: data.destination,
            licenseNum: schedule.vehicle.number,
            model: schedule.vehicle.model,
            driverTitle: schedule.driver.title,
            driverMobile: schedule.driver.mobile
        };

        // sms text to customer
        smsService.orderScheduled(data.mobile, data.name, smsText);

        // sms text to driver
        smsService.driverScheduled(schedule.driver.mobile, schedule.driver.title, smsText);

        return data;
    });
};