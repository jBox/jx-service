const { ORDER_STATUS } = require("../../utils/constants");

module.exports.refineManageOrder = (order) => {

    const { vehicles, service } = order;
    const scheduled = vehicles.every(x => x.scheduled);
    const cancelled = service.status === ORDER_STATUS.cancelled.id;
    const status = cancelled ? ORDER_STATUS.cancelled
        : (
            scheduled ? ORDER_STATUS.scheduled : ORDER_STATUS[order.status]
        );

    return {
        ...order,
        status
    };
};