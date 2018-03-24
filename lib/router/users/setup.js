const { isUsernameValid, isPasswordValid } = require("../../utils");
const { BadRequestError } = require("../../http-errors");

module.exports = (req, res, next) => {
    const { userService } = req.services;
    const { username, password, confirmPassword } = req.body;
    const { user } = req.auth;

    if (!isUsernameValid(username) || !isPasswordValid(password)) {
        return next(new BadRequestError("用户名或密码无效"));
    }

    if (password !== confirmPassword) {
        return next(new BadRequestError("确认密码不匹配"));
    }

    return userService.setupUsername(user.id, username, password).then((updated) =>
        res.send(updated)
    ).catch((error) => next(new BadRequestError(error)));
};