const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");

module.exports = (req, res, next) => {
    const { user } = req.auth;
    const { orderService, customerService, smsService } = req.services;
    const { version, schedules } = req.body;
    const { id } = req.params;

    return orderService.schedule(user, id, Number(version), schedules).then((data) => {
        if (isUndefined(data)) {
            return next(new NotFoundError("Data Not Found"));
        }

        const dateFrom = new Date(data.departureTime);
        const dateTo = new Date(data.departureTime);
        dateTo.setDate(dateTo.getDate() + Number(data.duration));

        // sms text to customer
        smsService.orderScheduled(data.mobile, data.name, {});

        for (let schedule of data.schedules) {
            // sms text to driver            
            const smsText = {
                dateFrom: dateFrom.format("MM-dd hh:mm"),
                dateTo: dateTo.format("MM-dd"),
                departure: data.departurePlace,
                destination: data.destination,
                licenseNum: schedule.licenseNumber,
                model: schedule.model,
                driverTitle: schedule.driver,
                driverMobile: schedule.mobile
            };
            smsService.driverScheduled(schedule.mobile, schedule.driver, smsText);
        }

        return data;
    });
};