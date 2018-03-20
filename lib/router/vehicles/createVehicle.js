const { validateVehicleInput } = require("./utils");

const createVehicle = (req, res, next) => {
    const { vehicleService } = req.services;
    return vehicleService.put(req.vehicle)
        .then((item) => res.send(item))
        .catch(error => next(error));
};

module.exports = [validateVehicleInput, createVehicle];