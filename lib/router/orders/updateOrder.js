const isUndefined = require("lodash/isUndefined");
const { NotFoundError, BadRequestError } = require("../../http-errors");

const validateUpdateOperation = (req, res, next) => {
    const { operation } = req.body;
    const { id } = req.params;
    const { customer: { orders } } = req.auth;

    const Allowed_Operations = ["cancel", "delete"];

    if (orders.includes(id) && Allowed_Operations.includes(operation)) {
        return next();
    }

    return next(new BadRequestError());
};

const update = (req, res, next) => {
    const { orderService, customerService } = req.services;
    const { version, operation } = req.body;
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