const { Base64 } = require("js-base64");

const PAGE_SIZE = 5;

const getQuery = (req) => {
    const { next } = req.query;
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

    const query = { orders: avaibleItems.slice(0, PAGE_SIZE), next: "" };
    if (avaibleItems.length > PAGE_SIZE) {
        query.next = Base64.encodeURI(avaibleItems[PAGE_SIZE]);
    }

    return query;
};

module.exports = (req, res, next) => {
    const { orderService } = req.services;
    const query = getQuery(req);
    return orderService.find(query.orders).then((orders) => {
        return res.send({
            next: query.next,
            orders
        });
    }).catch((error) => {
        return next(error);
    });
};