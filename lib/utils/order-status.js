const { ORDER_STATUS, ORDER_STATUS_LIST } = require("./constants");

class OrderStatus {
    constructor(order) {
        this.order = order;
    }

    status() {
        return ORDER_STATUS[this.order.status];
    }

    ge(status) {
        const index = ORDER_STATUS_LIST[status];
        return index >= ORDER_STATUS_LIST[this.order.status];
    }

    le(status) {
        const index = ORDER_STATUS_LIST[status];
        return index <= ORDER_STATUS_LIST[this.order.status];
    }
}

module.exports = OrderStatus;