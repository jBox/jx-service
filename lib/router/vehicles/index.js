const { MODELS } = require("../../utils/constants");
const { NotFoundError } = require("../../http-errors");
const isUndefined = require("lodash/isUndefined");

const express = require("express");
const router = express.Router();

const createVehicle = require("./createVehicle");
const updateVehicle = require("./updateVehicle");

/* GET models */
router.get("/models", (req, res, next) => res.send(MODELS));

/* List vehicles */
router.get("/", (req, res, next) => {
    const { vehicleService } = req.services;
    return vehicleService.find().then((items) => {
        return res.send(items);
    });
});

/* Create vehicle */
router.post("/", ...createVehicle);

/* Update vehicle */
router.route("/:id")
    .get(/* get */(req, res, next) => {
        const { vehicleService } = req.services;
        const { id } = req.params;
        return vehicleService.get(id).then((item) => {
            if (isUndefined(item)) {
                return next(new NotFoundError());
            }

            return res.send(item);
        }).catch(error => next(error));
    })
    .put(/* update */...updateVehicle)
    .delete(/* delete */(req, res, next) => {
        const { vehicleService } = req.services;
        const { id } = req.params;
        return vehicleService.del(id)
            .then(() => res.send())
            .catch(error => next(error));
    });

module.exports = {
    baseUrl: "/vehicles",
    router
};