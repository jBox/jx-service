const { Base64 } = require("js-base64");

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

const getCustomerOrders = (req, res, next) => {
    const { orderService } = req.services;
    const query = createQueryWithFilter(req);
    return orderService.find(query.orders, query.filter).then((orders) => {
        const result = {
            orders: orders.slice(0, query.limit),
            next: query.next
        };

        if (orders.length > query.limit) {
            result.next = Base64.encodeURI(orders[query.limit].id);
        }

        return res.send(result);
    }).catch((error) => {
        return next(error);
    });
};

const manageOrderList = (req, res, next) => {
    const { user } = req.auth;
    if (user) {
        const { orderService } = req.services;
        const { next: q, filter = "all" } = req.query;
        const decodeNext = req.query.next ? Base64.decode(req.query.next) : "";

        const filterFn = createFilter(filter);
        return orderService.lookup(filterFn, PAGE_SIZE, decodeNext).then((result) => {
            return res.send({
                orders: result.data,
                next: result.next ? Base64.encodeURI(result.next) : ""
            });

        }).catch(error => next(error));
    }

    return next();
};

module.exports = [manageOrderList, getCustomerOrders];