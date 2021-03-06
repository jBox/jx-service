const { Base64 } = require("js-base64");
const { refineManageOrder } = require("./common");

const PAGE_SIZE = 6;

const createFilter = (filter) => {
    switch (filter) {
        case "all":
            return (order) => (!!order && !order.deleted);
        case "submitted":
            return (order) => (order && !order.deleted && order.service.status !== "cancelled" && order.status !== "completed");
        case "cancelled":
            return (order) => (order && !order.deleted && order.service.status === "cancelled");
        case "completed":
            return (order) => (order && !order.deleted && order.status === "completed");
        default:
            return (order) => (order && !order.deleted && order.status === filter);
    }
}

const createQueryWithFilter = (req) => {
    const { next, filter = "all" } = req.query;
    const { customer: { orders } } = req.auth;

    const orderredItems = [...orders].sort((a, b) => (Number(b) - Number(a)));
    let start = 0;
    if (next) {
        const decodeNext = Base64.decode(next);
        start = orderredItems.indexOf(decodeNext);
        if (start === -1) {
            start = 0;
        }
    }

    const avaibleItems = orderredItems.slice(start);
    const query = {
        orders: avaibleItems,
        filter: createFilter(filter),
        limit: PAGE_SIZE,
        next: ""
    };

    if (filter === "all") {
        query.orders = avaibleItems.slice(0, PAGE_SIZE);
        if (avaibleItems.length > PAGE_SIZE) {
            query.next = Base64.encodeURI(avaibleItems[PAGE_SIZE]);
        }
    }

    return query;
};

const manageOrderList = (req, res, next) => {
    const { user } = req.auth;
    const { orderService } = req.services;
    const { next: q, filter = "all" } = req.query;
    const decodeNext = req.query.next ? Base64.decode(req.query.next) : "";

    const filterFn = createFilter(filter);
    return orderService.lookup(filterFn, PAGE_SIZE, decodeNext).then((result) => {
        return res.send({
            orders: result.data.map((order) => refineManageOrder(order)),
            next: result.next ? Base64.encodeURI(result.next) : ""
        });

    }).catch(error => next(error));
};

module.exports = [manageOrderList];