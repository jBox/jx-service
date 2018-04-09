const { ORDER_STATUS } = require("./constants");

const SYSTEM = "系统";
const ADMIN = "管理员";
const CUSTOMER = "客户";
const DRIVER = "驾驶员";

const now = () => new Date().toISOString();

class OrderFlow {
    submit(order) {
        return {
            ...order,
            status: ORDER_STATUS.submitted.id,
            traces: [{ operator: SYSTEM, state: "生成订单", time: order.createTime }]
        }
    }
    cancel(order) {
        if (order.status !== ORDER_STATUS.submitted.id &&
            order.status !== ORDER_STATUS.confirmed.id &&
            order.status !== ORDER_STATUS.scheduled.id) {
            return order;
        }

        let status = ORDER_STATUS.cancelling.id;
        let trackingState = "申请取消订单";
        if (order.status === ORDER_STATUS.submitted.id) {
            status = ORDER_STATUS.cancelled.id;
            trackingState = "取消订单";
        }

        const traces = [
            ...order.traces,
            { operator: CUSTOMER, state: trackingState, time: now() }
        ];

        return {
            ...order,
            status,
            traces
        }
    }
    confirmCancel(order) {
        if (order.status !== ORDER_STATUS.cancelling.id) {
            return order;
        }

        const traces = [
            ...order.traces,
            { operator: ADMIN, state: "确认取消订单", time: now() }
        ];

        return {
            ...order,
            status: ORDER_STATUS.cancelled.id,
            traces
        }
    }
    confirm(order) {
        if (order.status !== ORDER_STATUS.submitted.id) {
            return order;
        }

        const traces = [
            ...order.traces,
            { operator: ADMIN, state: "确认订单", time: now() }
        ];

        return {
            ...order,
            status: ORDER_STATUS.confirmed.id,
            traces
        }
    }
    schedule(order, license, driver) {
        if (order.status !== ORDER_STATUS.confirmed.id) {
            return order;
        }

        const traces = [
            ...order.traces,
            { operator: ADMIN, state: `车牌: ${license} / 司机: ${driver.title}, ${driver.mobile}`, time: now() }
        ];

        return {
            ...order,
            status: ORDER_STATUS.scheduled.id,
            traces
        }
    }
    reSchedule(order, license, driver) {
        if (order.status !== ORDER_STATUS.scheduled.id) {
            return order;
        }

        const traces = [
            ...order.traces,
            { operator: ADMIN, state: `车牌：${license} / 驾驶员：${driver.nickname} / 联系电话：${driver.mobile}`, time: now() }
        ];

        return {
            ...order,
            status: ORDER_STATUS.scheduled.id,
            traces
        }
    }
    depart(order) {
        if (order.status !== ORDER_STATUS.scheduled.id) {
            return order;
        }

        const traces = [
            ...order.traces,
            { operator: DRIVER, state: "发车", time: now() }
        ];

        return {
            ...order,
            status: ORDER_STATUS.departure.id,
            traces
        }
    }
    revert(order) {
        if (order.status !== ORDER_STATUS.departure.id) {
            return order;
        }

        const traces = [
            ...order.traces,
            { operator: DRIVER, state: "收车", time: now() }
        ];

        return {
            ...order,
            status: ORDER_STATUS.reverted.id,
            traces
        }
    }
    sign(order) {
        if (order.status !== ORDER_STATUS.reverted.id) {
            return order;
        }

        const traces = [
            ...order.traces,
            { operator: ADMIN, state: "登记", time: now() }
        ];

        return {
            ...order,
            status: ORDER_STATUS.signed.id,
            traces
        }
    }
    bill(order) {
        if (order.status !== ORDER_STATUS.signed.id) {
            return order;
        }

        const traces = [
            ...order.traces,
            { operator: ADMIN, state: "生成账单", time: now() }
        ];

        return {
            ...order,
            status: ORDER_STATUS.billed.id,
            traces
        }
    }
    receipt(order) {
        if (order.status !== ORDER_STATUS.billed.id) {
            return order;
        }

        const traces = [
            ...order.traces,
            { operator: ADMIN, state: "开票", time: now() }
        ];

        return {
            ...order,
            status: ORDER_STATUS.receipted.id,
            traces
        }
    }
    complete(order) {
        if (order.status !== ORDER_STATUS.scheduled.id) {
            return order;
        }

        const traces = [
            ...order.traces,
            { operator: ADMIN, state: "完成", time: now() }
        ];

        return {
            ...order,
            status: ORDER_STATUS.completed.id,
            traces
        }
    }
}

module.exports = new OrderFlow();