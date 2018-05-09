module.exports.MODELS = {
    mvp: { id: "mvp", label: "商务车" },
    sedan: { id: "sedan", label: "轿车" },
    midibus: { id: "midibus", label: "中巴车" },
    bus: { id: "bus", label: "大巴车" }
};

module.exports.ORDER_STATUS = {
    submitted: { id: "submitted", label: "订单已提交" },
    cancelled: { id: "cancelled", label: "订单已取消" },
    confirmed: { id: "confirmed", label: "订单已确认" },
    scheduled: { id: "scheduled", label: "已安排车辆" },
    departure: { id: "departure", label: "已出车" },
    reverted: { id: "reverted", label: "已收车" },
    completed: { id: "completed", label: "已完成" }
};

module.exports.ORDER_STATUS_LIST = [
    "submitted", "cancelled", "confirmed", "scheduled", "departure", "reverted", "completed"
];

module.exports.ORDER_SERVICE = {
    cancelling: { id: "cancelling", label: "申请取消订单" },
    cancelled: { id: "cancelled", label: "订单已取消" }
};

module.exports.ORDER_EDITABLE_FIELDS = [
    "department", "vehicles", "name", "mobile", "departureTime", "departurePlace", "destination", "duration", "notes"
];
