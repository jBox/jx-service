const flow = require("../../utils/order-flow");
const { MODELS } = require("../../utils/constants");
const { BadRequestError } = require("../../http-errors");

const extractVehicles = (vehicles = []) => {
    if (vehicles.length === 0) {
        return vehicles;
    }

    return vehicles.reduce((items, item) => {
        const model = MODELS[item.model];
        const count = Number(item.count);
        if (model && count > 0) {
            return items.concat({
                model,
                count,
                withDriver: !!item.withDriver,
                notes: item.notes || ""
            });
        }

        return items;
    }, []);
};

const extractOrder = (input) => {
    const checkMobile = (str) => (/^1\d{10}$/g.test(str));
    const createTime = new Date().toISOString();
    const order = {
        vehicles: extractVehicles(input.vehicles),
        name: input.name,
        mobile: input.mobile,
        departureTime: input.departureTime,
        departurePlace: input.departurePlace,
        destination: input.destination,
        duration: input.duration,
        notes: input.notes || "",
        createTime
    };

    let isValid = true &&
        order.name &&
        order.departureTime &&
        order.departurePlace &&
        order.destination;

    if (isValid && !checkMobile(order.mobile)) {
        isValid = false;
    }

    if (isValid && order.duration <= 0) {
        isValid = false;
    }

    if (isValid && order.vehicles.length === 0) {
        isValid = false;
    }

    if (isValid) {
        return flow.submit(order);
    }

    return null;
};

module.exports = (req, res, next) => {
    const order = extractOrder(req.body);
    if (!order) {
        return next(new BadRequestError());
    }

    const { orderService, customerService } = req.services;
    const { customer } = req.auth;
    order.customerId = customer.id;

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
