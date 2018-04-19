const { ORDER_STATUS, ORDER_SERVICE } = require("./constants");
const OrderStatus = require("./order-status");

const now = () => new Date().toISOString();

const ILLEGAL_OPERATION = "非法操作";

class OrderFlow {
    constructor(order) {
        this.order = order;
        this.orderStatus = new OrderStatus(order);
    }

    submit(customer) {
        return {
            ...this.order,
            status: ORDER_STATUS.submitted.id,
            traces: [{
                operator: customer.id,
                state: ORDER_STATUS.submitted.label,
                time: this.order.createTime
            }]
        }
    }

    cancel(customer) {
        if (this.orderStatus.ge(ORDER_STATUS.departure.id)) {
            throw new Error(ILLEGAL_OPERATION);
        }

        const service = {
            status: ORDER_SERVICE.cancelling.id,
            time: now()
        };

        let trackingState = ORDER_SERVICE.cancelling.label;
        if (this.order.status === ORDER_STATUS.submitted.id) {
            service.status = ORDER_SERVICE.cancelled.id;
            trackingState = ORDER_SERVICE.cancelled.label;
        }

        const traces = [
            ...this.order.traces,
            { operator: customer.id, state: trackingState, time: now() }
        ];

        return {
            ...this.order,
            service,
            traces
        };
    }

    confirmCancel(user) {
        if (this.orderStatus.ge(ORDER_STATUS.departure.id)) {
            throw new Error(ILLEGAL_OPERATION);
        }

        const traces = [
            ...this.order.traces,
            { operator: user.id, state: ORDER_SERVICE.cancelled.label, time: now() }
        ];

        return {
            ...this.order,
            service: {
                status: ORDER_SERVICE.cancelled.id,
                time: now()
            },
            traces
        }
    }

    confirm(user) {
        if (this.order.status !== ORDER_STATUS.submitted.id) {
            throw new Error(ILLEGAL_OPERATION);
        }

        const traces = [
            ...this.order.traces,
            { operator: user.id, state: ORDER_STATUS.confirmed.label, time: now() }
        ];

        return {
            ...this.order,
            status: ORDER_STATUS.confirmed.id,
            traces
        }
    }

    schedule(user, license, driver) {
        const oStatus = this.order.status;
        if (oStatus !== ORDER_STATUS.confirmed.id && oStatus !== ORDER_STATUS.scheduled.id) {
            throw new Error(ILLEGAL_OPERATION);
        }

        const traces = [
            ...this.order.traces,
            { operator: user.id, state: `车牌: ${license} / 司机: ${driver.title}, ${driver.mobile}`, time: now() }
        ];

        return {
            ...this.order,
            status: ORDER_STATUS.scheduled.id,
            traces,
            schedule: { license, driver }
        }
    }

    depart(user) {
        if (this.order.status !== ORDER_STATUS.scheduled.id) {
            throw new Error(ILLEGAL_OPERATION);
        }

        const traces = [
            ...this.order.traces,
            { operator: user.id, state: ORDER_STATUS.departure.label, time: now() }
        ];

        return {
            ...this.order,
            status: ORDER_STATUS.departure.id,
            traces
        }
    }

    revert(user) {
        if (this.order.status !== ORDER_STATUS.departure.id) {
            throw new Error(ILLEGAL_OPERATION);
        }

        const traces = [
            ...this.order.traces,
            { operator: user.id, state: ORDER_STATUS.reverted.label, time: now() }
        ];

        return {
            ...this.order,
            status: ORDER_STATUS.reverted.id,
            traces
        }
    }

    complete(order) {
        if (this.order.status !== ORDER_STATUS.reverted.id) {
            throw new Error(ILLEGAL_OPERATION);
        }

        const traces = [
            ...this.order.traces,
            { operator: ADMIN, state: ORDER_STATUS.completed.label, time: now() }
        ];

        return {
            ...this.order,
            status: ORDER_STATUS.completed.id,
            traces
        }
    }
}

module.exports = OrderFlow;