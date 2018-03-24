const { BadRequestError } = require("../../http-errors");
const { validateMobileNumber, isUsernameValid, isPasswordValid } = require("../../utils");

const validateRegister = (req, res, next) => {
    const { captchaService } = req.services;
    const { nickname, mobile, captcha, username, password, confirmPassword } = req.body;
    const error = {
        message: ""
    };

    if (!nickname) {
        error.message = "姓名不能为空";
    }

    if (!validateMobileNumber(mobile)) {
        error.message = "手机号码不正确";
    }

    if (!/^\d{6}$/g.test(captcha)) {
        error.message = "验证码不正确";
    }

    return captchaService.verify("register", mobile, captcha).then(() => {
        if (username) {
            if (!isUsernameValid(username)) {
                error.message = "用户名必须以字母开头，只能包含字母和数字或者(-,_)，长度不能小于5。";
            }

            if (!isPasswordValid(password)) {
                error.message = "密码长度不能小于6。";
            }

            if (password !== confirmPassword) {
                error.message = "确认密码不匹配。";
            }

            if (error.message) {
                return next(new BadRequestError(error.message));
            }
        }

        req.register = { nickname, mobile, username, password };
        return next();

    }).catch(() => next(new BadRequestError("验证码不正确")));
}

const register = (req, res, next) => {
    const { userService } = req.services;
    const { nickname, mobile, username, password } = req.register;

    return userService.register(nickname, mobile, username, password).then((reg) =>
        res.send(reg)
    ).catch((error) => next(new BadRequestError(error)));
};

module.exports = [validateRegister, register];