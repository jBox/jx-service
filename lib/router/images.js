const { NotFoundError } = require("../http-errors");
const express = require("express");
const router = express.Router();

router.get("/:identity", (req, res, next) => {
    const { imageService } = req.services;
    const thumbnail = req.query.hasOwnProperty("thumbnail");
    const { identity } = req.params;

    return imageService.get(identity, thumbnail).then((img) =>
        res.send(img)
    ).catch(error => next(new NotFoundError()));
});

module.exports = {
    baseUrl: "/images",
    router
};