const isUndefined = require("lodash/isUndefined");
const { NotFoundError, BadRequestError } = require("../../http-errors");

const validateUpdateOperation = (req, res, next) => {
    const { user, customer } = req.auth;

    if (user) {
        return userOperation(req, res, next);
    }

    if (customer) {
        return customerOperation(req, res, next);
    }

    return next(new BadRequestError());
};

const userOperation = (req, res, next) => {
    const { operation } = req.body;
    const { user } = req.auth;

    const Allowed_Operations = ["confirm", "schedule", "cancel-confirm", "complete"];

    if (Allowed_Operations.includes(operation)) {
        return next();
    }

    return next(new BadRequestError());
};

const customerOperation = (req, res, next) => {
    const { operation } = req.body;
    const { id } = req.params;
    const { user, customer: { orders } } = req.auth;

    const Allowed_Operations = ["cancel", "delete"];

    if (orders.includes(id) && Allowed_Operations.includes(operation)) {
        return next();
    }

    return next(new BadRequestError());
};

const update = (req, res, next) => {
    const { orderService, customerService, smsService } = req.services;
    const { version, operation, schedule } = req.body;
    const { id } = req.params;

    let operator = null;
    switch (operation) {
        case "cancel":
            operator = orderService.cancel(id, Number(version)).then((data) => {
                if (isUndefined(data)) {
                    return next(new NotFoundError("Data Not Found"));
                }

                return data;
            });
            break;
        case "delete":
            operator = orderService.del(id, Number(version)).then((data) => {
                if (isUndefined(data)) {
                    return next(new NotFoundError("Data Not Found"));
                }

                const orders = [];
                const { customer } = req.auth;
                for (let order of customer.orders) {
                    if (order.id !== data.id) {
                        orders.push(order);
                    }
                }
                customer.orders = orders;
                return customerService.put(customer).then(() => (data));
            });
            break;
        case "confirm":
            operator = orderService.confirm(id, Number(version)).then((data) => {
                if (isUndefined(data)) {
                    return next(new NotFoundError("Data Not Found"));
                }

                // sms text to customer
                customerService.get(data.customerId).then((customer) =>
                    smsService.orderAccepted(customer.mobile, customer.name, data.id)
                ).catch((error) => console.error(error));

                return data;
            });
            break;
        case "schedule":
            operator = orderService.schedule(id, Number(version), schedule).then((data) => {
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
            break;
        case "cancel-confirm":
            operator = orderService.confirmCancel(id, Number(version)).then((data) => {
                if (isUndefined(data)) {
                    return next(new NotFoundError("Data Not Found"));
                }

                // sms text to driver and customer

                return data;
            });
            break;
        case "complete":
            operator = orderService.complete(id, Number(version)).then((data) => {
                if (isUndefined(data)) {
                    return next(new NotFoundError("Data Not Found"));
                }

                // sms text to driver and customer

                return data;
            });
            break;
        default:
            operator = Promise.reject(new BadRequestError());
            break;
    }

    return operator.then((data) => {
        return res.send(data);
    }).catch((error) => {
        return next(error);
    });
};

module.exports = [validateUpdateOperation, update];