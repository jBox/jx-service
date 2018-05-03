const isUndefined = require("lodash/isUndefined");
const { NotFoundError } = require("../../../http-errors");
const { refineManageOrder } = require("../common");

module.exports = (req, res, next) => {
    const { user } = req.auth;
    const { orderService, customerService, smsService } = req.services;
    const { version, schedules } = req.body;
    const { id } = req.params;

    return orderService.get(id).then((item) => {
        if (isUndefined(item)) {
            return next(new NotFoundError("Data Not Found"));
        }

        const { schedules: old } = item;

        return orderService.schedule(user, id, Number(version), schedules).then((order) => {
            const warning = { message: "" };

            // sms text to customer
            smsService.orderScheduled(order.mobile, order.contact, { orderId: order.id })
                .catch((error) => {
                    warning.message = "短信通知客户失败：" + error;
                    console.error("Scheduled text to customer", error);
                });

            const unschedules = [];
            let newschedules = [];
            if (old.length === 0) {
                newschedules = order.schedules;
            } else {
                for (let o of old) {
                    if (order.schedules.every(x => x.mobile !== o.mobile)) {
                        unschedules.push(o);
                    }
                }
                for (let s of order.schedules) {
                    if (old.every(x => x.mobile !== s.mobile)) {
                        newschedules.push(s);
                    }
                }
            }

            for (let schedule of newschedules) {
                // sms text to driver scheduled      
                const smsText = {
                    orderId: order.id,
                    licenseNumber: schedule.licenseNumber
                };
                smsService.driverScheduled(schedule.mobile, schedule.driver, smsText)
                    .catch((error) => console.error("Scheduled text to driver", error));
            }

            for (let schedule of unschedules) {
                // sms text to driver schedule cancelled          
                const smsText = {
                    orderId: order.id,
                    licenseNumber: schedule.licenseNumber
                };
                smsService.driverScheduleCancelled(schedule.mobile, schedule.driver, smsText)
                    .catch((error) => console.error("Scheduled text to driver", error));
            }

            return refineManageOrder(order);
        });
    });
};