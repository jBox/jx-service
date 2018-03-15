module.exports.MODELS = {
    mvp: { id: "mvp", label: "商务车" },
    sedan: { id: "sedan", label: "轿车" }
};

module.exports.ORDER_STATUS = {
    submitted: { id: "submitted", label: "订单已提交" },
    cancelling: { id: "cancelling", label: "申请取消订单" },
    cancelled: { id: "cancelled", label: "订单已取消" },
    confirmed: { id: "confirmed", label: "订单已确认" },
    scheduled: { id: "scheduled", label: "已安排车辆" },
    departure: { id: "departure", label: "已出车" },
    reverted: { id: "reverted", label: "已收车" },
    signed: { id: "signed", label: "已登记" },
    billed: { id: "billed", label: "生成账单" },
    receipted: { id: "receipted", label: "已开票" },
    completed: { id: "completed", label: "已完成" }
};
