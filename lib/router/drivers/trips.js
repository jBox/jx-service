const { BadRequestError, NotFoundError } = require("../../http-errors");
const { validateContentType } = require("../../utils");
const userHandler = require("../../handlers/user-handler");
const isUndefined = require("lodash/isUndefined");

const mapOrderToTrip = (order, vehicle = { number: "", model: { id: "", label: "" } }) => {
    return {
        "id": order.id,
        "contact": order.contact,
        "mobile": order.mobile,
        "departureTime": order.departureTime,
        "departurePlace": order.departurePlace,
        "destination": order.destination,
        "duration": order.duration,
        "notes": order.notes,
        "version": order.version,
        "licenseNunber": vehicle.number,
        "vehicleModel": vehicle.model.label,
        "status": order.status,
        "progress": order.progress || []
    };
};

const responseTrip = (order, req, res, next) => {
    const { vehicleService } = req.services;
    const licenseNunber = order.schedule.license;
    return vehicleService.find((v) => v.number === licenseNunber).then((vehicles) => {
        if (vehicles.length === 0) {
            return next(new NotFoundError("Vehicle not found."));
        }

        const trip = mapOrderToTrip(order, vehicles[0]);

        return res.send(trip);
    }).catch(error => next(error));
};

const current = [userHandler("driver"), (req, res, next) => {
    const { user } = req.auth;
    const { orderService, vehicleService } = req.services;

    const filter = (item) =>
        !item.deleted &&
        !item.service.status &&
        ["scheduled", "departure"].includes(item.status) &&
        item.schedule &&
        item.schedule.driver.mobile === user.mobile;

    return orderService.all(filter).then((orders) => {
        if (orders.length === 0) {
            return next(new NotFoundError());
        }

        //sort orders
        orders.sort((a, b) => {
            if (a.departureTime === b.departureTime) {
                return Number(b.id) - Number(a);
            }

            const aDepartureTime = new Date(a.departureTime);
            const bDepartureTime = new Date(b.departureTime);
            return bDepartureTime.getTime() - aDepartureTime.getTime();
        });

        return responseTrip(orders[0], req, res, next);
    }).catch(error => next(error));
}];

const list = [userHandler("driver"), (req, res, next) => {
    const { user } = req.auth;
    const { orderService } = req.services;

    return orderService.all((item) => !item.deleted && !item.service.status).then((orders) => {
        const trips = orders.reduce((items, order) => {
            const { schedule } = order;
            if (schedule && schedule.driver.mobile === user.mobile) {
                return items.concat({
                    "id": "20180410000005",
                    "contact": "师傅",
                    "mobile": "18688981234",
                    "departureTime": "2018-04-11T01:00:00.000Z",
                    "departurePlace": "Shenzhen",
                    "destination": "destination destination",
                    "duration": 3,
                    "notes": "其他信息",
                    "version": 1524018704140,
                    "licenseNunber": "粤A23233",
                    "vehicleModel": "商务车",
                    "status": { id: "scheduled" }, //scheduled,departure,reverted
                    "progress": []
                });
            }

            return items;
        }, []);
        return res.send(trips);
    }).catch(error => next(error));
}];

const get = [userHandler("driver"), (req, res, next) => { }];

const validateUpdateOperation = (req, res, next) => {
    const { operation } = req.body;
    const Allowed_Operations = ["progress", "depart", "revert"];
    if (Allowed_Operations.includes(operation)) {
        return next();
    }

    return next(new BadRequestError("Operation not allowed."));
};

const update = [
    userHandler("driver"),
    validateContentType("application/json"),
    validateUpdateOperation,
    (req, res, next) => {
        const { user } = req.auth;
        const { id } = req.params;
        const { operation, version, data } = req.body;
        const { orderService } = req.services;
        return orderService[operation](user, id, Number(version), null, data).then((order) => {
            if (isUndefined(order)) {
                return next(new NotFoundError("Data Not Found"));
            }

            return responseTrip(order, req, res, next);
        }).catch((error) => next(error));
    }
];

module.exports = {
    current,
    list,
    get,
    update
};

