const { BadRequestError, NotFoundError } = require("../http-errors");

const express = require("express");
const router = express.Router();

const validateCategory = (req, res, next) => {
    const categories = [
        "login",
        "register",
        // "code"
    ];

    const { category, identity } = req.params;
    if (identity && categories.includes(category)) {
        return next();
    }

    return next(new BadRequestError());
};

/* create captcha */
router.post("/:category/:identity", validateCategory, (req, res, next) => {
    const { captchaService } = req.services;
    const { expires_in, digit } = req.body;
    const { category, identity } = req.params;
    const options = {
        category,
        expiresIn: Number(expires_in) || 1800, //default 30 * 60 seconds
        digit: Number(digit) || 6 //default 6 digit
    };

    return captchaService.generate(identity, options).then(() =>
        res.send()
    ).catch(error => next(error));
});

router.post("/:category/:identity/verify", validateCategory, (req, res, next) => {
    const { captchaService } = req.services;
    const { code } = req.body;
    const { category, identity } = req.params;

    return captchaService.verify(category, identity, code).then(() =>
        res.send()
    ).catch(error => next(new NotFoundError()));
});

module.exports = {
    baseUrl: "/captchas",
    router
};