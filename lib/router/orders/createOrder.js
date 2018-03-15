module.exports = (req, res, next) => {
    const { orderService, customerService } = req.services;
    const { customer } = req.auth;
    const order = {
        ...req.order,
        customerId: customer.id
    };

    return orderService.put(order).then((data) => {
        if (!customer.orders) {
            customer.orders = [];
        }

        // update customer orders
        customer.orders.push(data.id);
        return customerService.put(customer).then(() => res.send(data));
    }).catch((error) => {
        return next(error);
    });
};
