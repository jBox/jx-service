module.exports = (req, res, next) => {
    const { userService } = req.services;
    return userService.find("register").then((regs) => {
        return res.send(regs.map((reg) => ({
            nickname: reg.nickname,
            mobile: reg.mobile,
            username: reg.username,
            registerTime: reg.registerTime
        })));
    }).catch((error) => next(error));
};