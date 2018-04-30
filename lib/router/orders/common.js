const { ORDER_STATUS } = require("../../utils/constants");

module.exports.refineManageOrder = (order) => {

    const { vehicles, service } = order;
    const scheduled = vehicles.every(x => x.scheduled);
    const cancelled = service.status === ORDER_STATUS.cancelled.id;
    let status = ORDER_STATUS[order.status];
    if (status.id !== ORDER_STATUS.completed.id) {
        if (cancelled) {
            status = ORDER_STATUS.cancelled;
        } else if (scheduled) {
            status = ORDER_STATUS.scheduled;
        }
    }

    return {
        ...order,
        status
    };
};