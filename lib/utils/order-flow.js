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

    schedule(user, schedules/*[{belongs,licenseNumber, model, driver, mobile}]*/) {
        const oStatus = this.order.status;
        if (oStatus !== ORDER_STATUS.confirmed.id && oStatus !== ORDER_STATUS.scheduled.id) {
            throw new Error(ILLEGAL_OPERATION);
        }

        const updates = {};
        // update old schedules
        if (this.order.schedules && this.order.schedules.length > 0) {
            for (let schedule of this.order.schedules) {
                const key = `${schedule.mobile}${this.order.id}`;
                updates[key] = null;
            }
        }

        // update new schedules
        for (let schedule of schedules) {
            const key = `${schedule.mobile}${this.order.id}`;
            updates[key] = {
                ...schedule,
                orderId: this.order.id,
                start: this.order.departureTime,
                end: this.order.revertTime
            };
        }

        // update vehicle states
        const vehicles = this.order.vehicles.map((item) => {
            const any = schedules.find(x => x.belongs === item.id);
            return { ...item, scheduled: !!any };
        });

        const traces = [
            ...this.order.traces,
            {
                operator: user.id,
                state: `出车安排: ${schedules.map((schedule) => (
                    `${schedule.driver}（${schedule.mobile}）, ${schedule.licenseNumber}`
                )).join(" / ")}`,
                time: now()
            }
        ];

        return {
            order: {
                ...this.order,
                traces,
                schedules,
                vehicles
            },
            updates
        };
    }

    depart(user, schedule) {
        if (this.order.status !== ORDER_STATUS.confirmed.id) {
            throw new Error(ILLEGAL_OPERATION);
        }

        let driverSchedule = null;
        if (schedule) {
            driverSchedule = this.order.schedules.find(x => x.id === schedule.id);
        } else {
            driverSchedule = this.order.schedules.find(x => x.mobile === user.mobile);
        }

        if (!driverSchedule) {
            throw new Error(ILLEGAL_OPERATION);
        }

        const traces = [
            ...this.order.traces,
            { operator: user.id, state: `${driverSchedule.licenseNumber} 已发车`, time: now() }
        ];

        driverSchedule.status = "start";

        return {
            ...this.order,
            traces
        }
    }

    revert(user, schedule) {
        if (this.order.status !== ORDER_STATUS.confirmed.id) {
            throw new Error(ILLEGAL_OPERATION);
        }

        let driverSchedule = null;
        if (schedule) {
            driverSchedule = this.order.schedules.find(x => x.id === schedule.id);
        } else {
            driverSchedule = this.order.schedules.find(x => x.mobile === user.mobile);
        }

        if (!driverSchedule) {
            throw new Error(ILLEGAL_OPERATION);
        }

        const traces = [
            ...this.order.traces,
            { operator: user.id, state: `${driverSchedule.licenseNumber} 已收车`, time: now() }
        ];

        driverSchedule.status = "end";

        return {
            ...this.order,
            traces
        }
    }

    progress(user, schedule, data) {
        if (this.orderStatus.le(ORDER_STATUS.confirmed.id)) {
            throw new Error(ILLEGAL_OPERATION);
        }

        let driverSchedule = null;
        if (schedule) {
            driverSchedule = this.order.schedules.find(x => x.id === schedule.id);
        } else {
            driverSchedule = this.order.schedules.find(x => x.mobile === user.mobile);
        }

        if (!driverSchedule) {
            throw new Error(ILLEGAL_OPERATION);
        }

        const calcTerms = (dateFrom, duration) => {
            const FORMAT = "yyyy-MM-dd";
            const dateStart = new Date(dateFrom);
            const initialDate = dateStart.getDate();
            const terms = [];
            for (let i = 0; i < duration; i++) {
                dateStart.setDate(initialDate + i);
                terms.push(dateStart.format(FORMAT));
            }

            return terms;
        };

        const terms = calcTerms(this.order.departureTime, this.order.duration);
        const currentProgress = driverSchedule.progress || [];
        const newProgress = data || [];
        const progress = terms.reduce((ps, term) => {
            const newItem = newProgress.find(x => x.date === term);
            if (newItem) {
                return ps.concat(newItem);
            } else {
                const existsItem = currentProgress.find(x => x.date === term);
                if (existsItem) {
                    return ps.concat(existsItem);
                }
            }

            return ps;
        }, []);

        driverSchedule.progress = progress;

        return {
            ...this.order
        }
    }

    complete(user) {
        if (this.order.status !== ORDER_STATUS.confirmed.id) {
            throw new Error(ILLEGAL_OPERATION);
        }

        const allSchedulesEnded = this.order.schedules.length > 0 &&
            this.order.schedules.every(s => s.status === "end");
        if (!allSchedulesEnded) {
            throw new Error(ILLEGAL_OPERATION);
        }

        const traces = [
            ...this.order.traces,
            { operator: user.id, state: ORDER_STATUS.completed.label, time: now() }
        ];

        return {
            ...this.order,
            status: ORDER_STATUS.completed.id,
            traces
        }
    }
}

module.exports = OrderFlow;