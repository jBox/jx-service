const { BadRequestError } = require("../../http-errors");
const isUndefined = require("lodash/isUndefined");
const { validateVehicleInput } = require("./utils");

const updateVehicle = (req, res, next) => {
    const { id } = req.params;
    const { vehicleService } = req.services;
    return vehicleService.get(id).then((item) => {
        if (isUndefined(item)) {
            return next(new BadRequestError());
        }

        return vehicleService.put({ ...req.vehicle, id, version: Number(req.body.version) })
            .then((latest) => res.send(latest));
    }).catch(error => next(error));
};

module.exports = [validateVehicleInput, updateVehicle];