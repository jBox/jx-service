const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");

module.exports = (req, res, next) => {
    const { orderService, customerService } = req.services;
    const { version } = req.body;
    const { id } = req.params;

    return orderService.del(id, Number(version)).then((data) => {
        if (isUndefined(data)) {
            return next(new NotFoundError("Data Not Found"));
        }

        const orders = [];
        const { customer } = req.auth;
        for (let order of customer.orders) {
            if (order !== data.id) {
                orders.push(order);
            }
        }
        customer.orders = orders;
        return customerService.put(customer).then(() => (data));
    });
};