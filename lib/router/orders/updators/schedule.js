const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");

module.exports = (req, res, next) => {
    const { orderService, customerService, smsService } = req.services;
    const { version, schedule, order } = req.body;
    const { id } = req.params;

    return orderService.schedule(id, Number(version), schedule).then((data) => {
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
        customerService.get(data.customerId).then((customer) =>
            smsService.orderScheduled(customer.mobile, customer.name, smsText)
        ).catch((error) => console.error(error));

        // sms text to driver
        smsService.driverScheduled(schedule.driver.mobile, schedule.driver.title, smsText);

        return data;
    });
};