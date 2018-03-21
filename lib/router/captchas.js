const { BadRequestError, NotFoundError } = require("../http-errors");
const { validateContentType } = require("../utils");
const rolesHandler = require("../handlers/roles-handler");

const express = require("express");
const router = express.Router();

/* Get or create mobile captcha */
router.route("/:mobile")
    .get((req, res, next) => {
        const { captchaService } = req.services;
        const { mobile } = req.params;
        return captchaService.get(mobile).then((code) => {
            if (!code) {
                return next(new NotFoundError());
            }

            return res.send(code);
        }).catch(error => next(error));
    })
    .post((req, res, next) => {
        const { captchaService } = req.services;
        const { expires_in } = req.body;
        const { mobile } = req.params;
        const expiresIn = Number(expires_in) || 60; //default 60 seconds

        return captchaService.generate(mobile, { expiresIn }).then((code) =>
            res.send(code)
        ).catch(error => next(error));
    });

module.exports = {
    baseUrl: "/captchas",
    router
};