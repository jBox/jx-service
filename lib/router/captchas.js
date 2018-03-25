const { BadRequestError, NotFoundError } = require("../http-errors");

const getAvailable = () => {
    const now = new Date();
    now.setSeconds(now.getSeconds() + 60);
    return now.getTime();
};

const generationDetections = {
    detections: {},
    get(ip) {
        let detection = this.detections[ip];
        if (!detection) {
            detection = this.detections[ip] = { availableAt: 0 };
        }

        return detection;
    }
};

const express = require("express");
const router = express.Router();

const validateIP = (req, res, next) => {
    const { ip } = req;
    const detection = generationDetections.get(ip);
    const now = Date.now();
    if (detection.availableAt < now) {
        detection.availableAt = getAvailable();
        return next();
    }

    return next(new BadRequestError("访问过于频繁，请稍后重试！"));
};

const validateCategory = (req, res, next) => {
    const { userService } = req.services;
    const { category, identity } = req.params;

    const categories = [
        "login",
        "register"
    ];

    if (identity && categories.includes(category)) {
        const lookup = userService.lookup(identity);
        switch (category) {
            case "login":
                return lookup.then(() => next()).catch(() => next(new BadRequestError("手机号码不可用！")));
            case "register":
                return lookup.then(() => next(new BadRequestError("手机号码不可用！"))).catch(() => next());
        }
    }

    return next(new BadRequestError());
};

const getExpiresIn = (input) => {
    const expiresIn = Number(input) || 1800;
    if (expiresIn < 60) {
        return 60;
    }
    if (expiresIn > 7200) {
        return 7200;
    }
    return expiresIn;
};

const getDigit = (input) => {
    const digit = Number(input) || 6;
    if (digit < 4) {
        return 4;
    }
    if (digit > 8) {
        return 8;
    }
    return digit;
};

/* create captcha */
router.post("/:category/:identity", validateIP, validateCategory, (req, res, next) => {
    const { captchaService } = req.services;
    const { expires_in, digit } = req.body;
    const { category, identity } = req.params;
    const options = {
        category,
        expiresIn: getExpiresIn(expires_in),
        digit: getDigit(digit)
    };

    return captchaService.generate(identity, options).then(() =>
        res.send()
    ).catch(error => next(error));
});

router.post("/:category/:identity/verify", validateCategory, (req, res, next) => {
    const { captchaService } = req.services;
    const { code } = req.body;
    const { category, identity } = req.params;

    return captchaService.peek(category, identity, code).then(() =>
        res.send()
    ).catch(error => next(new NotFoundError()));
});

module.exports = {
    baseUrl: "/captchas",
    router
};