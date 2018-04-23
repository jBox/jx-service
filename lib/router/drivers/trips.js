const { BadRequestError, NotFoundError } = require("../../http-errors");
const { validateContentType } = require("../../utils");
const userHandler = require("../../handlers/user-handler");

const onboard = [userHandler("driver"), (req, res, next) => {
    const { user } = req.auth;
    const { orderService, vehicleService } = req.services;

    const filter = (item) =>
        !item.deleted &&
        !item.service.status &&
        ["scheduled", "departure"].includes(item.status);

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

        const mr = orders[0];
        const licenseNunber = mr.schedule.license;
        return vehicleService.find((v) => v.number === licenseNunber).then((vehicles) => {
            if (vehicles.length === 0) {
                return next(new NotFoundError("Vehicle not found."));
            }

            const vehicle = vehicles[0];
            const trip = {
                "id": mr.id,
                "name": mr.name,
                "mobile": mr.mobile,
                "departureTime": mr.departureTime,
                "departurePlace": mr.departurePlace,
                "destination": mr.destination,
                "duration": mr.duration,
                "notes": mr.notes,
                "version": mr.version,
                "licenseNunber": vehicle.number,
                "vehicleModel": vehicle.model.label,
                "status": mr.status,
                "progress": mr.progress || []
            };

            return res.send(trip);
        });
    }).catch(error => next(error));
}];

const listTrips = [userHandler("driver"), (req, res, next) => {
    const { user } = req.auth;
    const { orderService } = req.services;

    return orderService.all((item) => !item.deleted && !item.service.status).then((orders) => {
        const trips = orders.reduce((items, order) => {
            const { schedule } = order;
            if (schedule && schedule.driver.mobile === user.mobile) {
                return items.concat({
                    "id": "20180410000005",
                    "name": "师傅",
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

module.exports = {
    onboard,
    listTrips
};

