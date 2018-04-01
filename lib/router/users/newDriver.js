const { BadRequestError } = require("../../http-errors");
const { validateMobileNumber } = require("../../utils");

const validate = (req, res, next) => {
    const { userService } = req.services;
    const { mobile } = req.body;

    if (!validateMobileNumber(mobile)) {
        return next(new BadRequestError("手机号码不正确"))
    }

    const filter = (user) => {
        return user.actived && user.mobile === mobile && user.roles.includes("driver");
    };
    return userService.find("users", filter).then((drivers) => {
        if (drivers.length > 0) {
            return next(new BadRequestError("手机号码不可用"))
        }

        return next();
    }).catch((error) => next(error));
};

const create = (req, res, next) => {
    const { userService } = req.services;
    const { mobile, nickname, title } = req.body;

    return userService.lookup(mobile).then((user) => {
        // add role
        user.roles = [...user.roles, "driver"];
        user.title = title;
        return userService.modify(user).then((user) => {
            return res.send({ mobile, nickname: user.nickname, title });
        }).catch((error) => next(new BadRequestError(error.message)));
    }).catch(() => {
        return userService.create(mobile, ["driver"], { user: { nickname, title }, source: "manage" }).then((user) => {
            return res.send({ mobile, nickname: user.nickname, title });
        }).catch((error) => next(new BadRequestError(error.message)));
    });
};

module.exports = [validate, create];