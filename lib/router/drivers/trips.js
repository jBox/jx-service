const { BadRequestError, NotFoundError } = require("../../http-errors");
const { validateContentType } = require("../../utils");
const { ORDER_STATUS } = require("../../utils/constants");
const userHandler = require("../../handlers/user-handler");
const isUndefined = require("lodash/isUndefined");

const mapOrderToTrip = (mobile, order) => {
    const schedule = order.schedules.find(x => x.mobile === mobile);
    if (!schedule) {
        return null;
    }

    return {
        "id": order.id,
        "contact": order.contact,
        "mobile": order.mobile,
        "departureTime": order.departureTime,
        "departurePlace": order.departurePlace,
        "revertTime": order.revertTime,
        "destination": order.destination,
        "duration": order.duration,
        "notes": order.notes,
        "version": order.version,
        "schedule": { ...schedule }
    };
};

const current = [userHandler("driver"), (req, res, next) => {
    const { user } = req.auth;
    const { orderService, vehicleService } = req.services;

    return orderService.driverSchedules(user.mobile).then((schedules) => {
        if (schedules.length === 0) {
            return next(new NotFoundError());
        }

        const now = Date.now();

        //sort schedules
        schedules.sort((a, b) => {
            if (a.start === b.start) {
                return Number(b.id) - Number(a.id);
            }

            const aStartTime = new Date(a.start).getTime();
            const bStartTime = new Date(b.start).getTime();

            if (aStartTime > now && bStartTime > now) {
                return aStartTime - bStartTime;
            }

            return bStartTime - aStartTime;
        });

        return orderService.get(schedules[0].orderId).then((order) => {
            const trip = mapOrderToTrip(user.mobile, order);
            return res.send(trip);
        });
    }).catch(error => next(error));
}];

const list = [userHandler("driver"), (req, res, next) => {
    const { user } = req.auth;
    const { orderService } = req.services;
    const filter = (item) => !item.deleted && item.service.status !== "cancelled";
    return orderService.all(filter).then((orders) => {
        const trips = orders.reduce((items, order) => {
            const trip = mapOrderToTrip(user.mobile, order);
            if (trip && trip.schedule.status === "end") {
                return items.concat(trip);
            }

            return items;
        }, []);

        trips.sort((a, b) => {
            if (a.departureTime === b.departureTime) {
                return Number(b.id) - Number(a.id);
            }

            const aDepartureTime = new Date(a.departureTime);
            const bDepartureTime = new Date(b.departureTime);
            return bDepartureTime.getTime() - aDepartureTime.getTime();
        });

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

            const trip = mapOrderToTrip(user.mobile, order);
            return res.send(trip);
        }).catch((error) => next(error));
    }
];

module.exports = {
    current,
    list,
    get,
    update
};

