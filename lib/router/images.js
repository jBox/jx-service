const { NotFoundError } = require("../http-errors");
const express = require("express");
const router = express.Router();

router.get("/:identity", (req, res, next) => {
    const { imageService } = req.services;
    const thumbnail = req.query.hasOwnProperty("thumbnail");
    const { identity } = req.params;

    return imageService.get(identity, thumbnail).then((dataURL) => {
        const [header, type] = Array.from(/^data:(image\/\w+);base64,/ig.exec(dataURL));
        const b64string = dataURL.substr(header.length);
        res.type(type).send(Buffer.from(b64string, "base64"));
    }).catch(error => next(new NotFoundError()));
});

module.exports = {
    baseUrl: "/images",
    router
};