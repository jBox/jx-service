const { BadRequestError } = require("../../http-errors");
const { validateMobileNumber } = require("../../utils");

module.exports = (req, res, next) => {
    const { userService, smsService } = req.services;
    const { action, mobile, roles, reason } = req.body;

    if (!validateMobileNumber(mobile)) {
        return next(new BadRequestError("手机号码不正确"));
    }

    if (action === "pass") {
        if (!roles || roles.length === 0) {
            return next(new BadRequestError("角色不能为空"));
        }

        return userService.createFromRegister(mobile, roles).then((user) => {
            // sms to user register successfully
            const notice = smsService.registerSuccess(user.mobile, user.nickname)
                .catch(() => Promise.resolve());
            return notice.then(() => res.send(user));
        }).catch((error) => next(new BadRequestError(error)));
    } else if (action === "reject") {
        if (!reason) {
            return next(new BadRequestError("请输入拒绝理由"));
        }

        return userService.removeRegister(mobile).then((reg) => {
            // sms to user register reject
            const notice = smsService.registerReject(mobile, reg.nickname, reason)
                .catch(() => Promise.resolve());
            return notice.then(() => res.send());
        }).catch((error) => next(new BadRequestError(error)));
    }


    return next(new BadRequestError());
};