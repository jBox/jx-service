const { BadRequestError } = require("../../../http-errors");
const { validateContentType } = require("../../../utils");
const rolesHandler = require("../../../handlers/roles-handler");
const OrderFlow = require("../../../utils/order-flow");
const { MODELS } = require("../../../utils/constants");
const { refineCustomerOrder } = require("./common");

const extractVehicles = (vehicles = []) => {
    if (vehicles.length === 0) {
        return vehicles;
    }

    return vehicles.reduce((items, item) => {
        const modelId = item.model && item.model.id;
        const model = MODELS[modelId];
        const count = Number(item.count);
        if (model && count > 0) {
            return items.concat({
                id: item.id,
                model,
                count,
                withDriver: !!item.withDriver,
                notes: item.notes || "",
                scheduled: false
            });
        }

        return items;
    }, []);
};

const validateInputs = (req, res, next) => {
    const { customer } = req.auth;
    const input = req.body;
    const checkMobile = (str) => (/^1\d{10}$/g.test(str));
    const createTime = new Date().toISOString();
    const lastUpdateTime = createTime;
    const order = {
        schedules: [],
        service: {},
        vehicles: extractVehicles(input.vehicles),
        department: customer.department,
        contact: input.contact,
        mobile: input.mobile,
        departureTime: input.departureTime,
        departurePlace: input.departurePlace,
        destination: input.destination,
        duration: input.duration,
        notes: input.notes || "",
        createTime,
        lastUpdateTime
    };

    let isValid = true &&
        order.contact &&
        order.departurePlace &&
        order.destination;

    if (!isValid) {
        return next(new BadRequestError("输入信息有误"));
    }

    if (new Date(order.departureTime).getTime() <= Date.now()) {
        return next(new BadRequestError("无效的出发时间"));
    }

    if (!checkMobile(order.mobile)) {
        return next(new BadRequestError("联系号码不正确"));
    }

    if (order.duration <= 0 || order.duration > 30) {
        return next(new BadRequestError("租车天数不正确"));
    }

    if (order.vehicles.length === 0) {
        return next(new BadRequestError("无效的租车信息"));
    }

    const start = new Date(order.departureTime);
    start.setDate(start.getDate() + order.duration - 1);
    start.setHours(18);
    start.setMinutes(0);
    start.setMilliseconds(0);
    order.revertTime = start.toISOString();

    req.body = order;
    return next();
};

const handlerFirstOrder = (customer, order) => {
    customer.orders = [];
    customer.name = order.contact;
    customer.mobile = order.mobile;
    customer.address = order.departurePlace;
};

module.exports = [
    rolesHandler("customer"),
    validateContentType("application/json"),
    validateInputs,
    (req, res, next) => {
        const { customer } = req.auth;
        const flow = new OrderFlow(req.body);
        const order = flow.submit(customer);

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

                return res.send(refineCustomerOrder(data));
            });
        }).catch((error) => {
            return next(error);
        });
    }
];