const { NotFoundError } = require("../../http-errors");
const { refineManageOrder } = require("./common");

const getOrder = (req, res, next) => {
    const { orderService } = req.services;
    const { id } = req.params;
    return orderService.get(id).then((order) => {
        if (!order) {
            return next(new NotFoundError());
        }

        return res.send(refineManageOrder(order));

    }).catch(error => next(error));
};

module.exports = [getOrder];