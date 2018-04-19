const { BadRequestError } = require("../../http-errors");
const { validateContentType } = require("../../utils");
const rolesHandler = require("../../handlers/roles-handler");
const OrderFlow = require("../../utils/order-flow");
const { MODELS } = require("../../utils/constants");

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
        service: {},
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
        return order;
    }

    return null;
};

const handlerFirstOrder = (customer, order) => {
    customer.orders = [];
    customer.name = order.name;
    customer.mobile = order.mobile;
    customer.address = order.departurePlace;
};

module.exports = [
    rolesHandler("customer"),
    validateContentType("application/json"),
    (req, res, next) => {
        const { customer } = req.auth;
        const flow = new OrderFlow(extractOrder(req.body))
        const order = flow.submit(customer);
        if (!order) {
            return next(new BadRequestError());
        }

        const { orderService, customerService, userService, smsService } = req.services;
        order.customerId = customer.id;

        return orderService.put(order).then((data) => {
            if (customer.orders.length === 0) {
                handlerFirstOrder(customer, data);
            }

            // update customer orders
            customer.orders.push(data.id);
            return customerService.put(customer).then(() => {
                // sms text to admin
                userService.dispatchers().then((dispatchers) => {
                    for (let dispatcher of dispatchers) {
                        smsService.orderCreated(dispatcher.mobile, data.id).catch(error => console.error(error));
                    };
                });

                return res.send(data);
            });
        }).catch((error) => {
            return next(error);
        });
    }
];