const { MODELS } = require("../../utils/constants");
const { BadRequestError } = require("../../http-errors");
const { validateVehicleNumber } = require("../../utils");

module.exports.validateVehicleInput = (req, res, next) => {
    const { vehicleService } = req.services;

    const { model, number } = req.body;
    if (!MODELS[model]) {
        return next(new BadRequestError("没有对应车型"));
    }

    if (!validateVehicleNumber(number)) {
        return next(new BadRequestError("车牌号码不正确"));
    }

    return vehicleService.find((item) => item.number === number).then((items) => {
        if (items.length > 0) {
            return next(new BadRequestError("车牌号码已存在"));
        }

        req.vehicle = { model, number };
        return next();
    });
};