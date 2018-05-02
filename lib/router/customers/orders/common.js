const { ORDER_STATUS } = require("../../../utils/constants");

exports.refineCustomerOrder = (order) => {
    const item = {
        "service": order.service,
        "schedules": order.schedules,
        "vehicles": order.vehicles,
        "contact": order.contact,
        "mobile": order.mobile,
        "departureTime": order.departureTime,
        "departurePlace": order.departurePlace,
        "destination": order.destination,
        "duration": order.duration,
        "notes": order.notes,
        "createTime": order.createTime,
        "lastUpdateTime": order.lastUpdateTime,
        "revertTime": order.revertTime,
        "status": ORDER_STATUS[order.status],
        "traces": order.traces,
        "id": order.id,
        "version": order.version
    };

    const { service, schedules } = order;
    if (service.status === ORDER_STATUS.cancelled.id) {
        item.status = ORDER_STATUS.cancelled;
    } else if (item.status === ORDER_STATUS.scheduled) {
        if (schedules.some(x => x.status === "start")) {
            item.status = ORDER_STATUS.departure;
        } else if (schedules.every(x => x.status === "end")) {
            item.status = ORDER_STATUS.reverted;
        }
    }

    return item;
};