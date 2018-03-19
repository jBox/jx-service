module.exports = (req, res, next) => {
    const { userService } = req.services;
    return userService.find("register").then((regs) => {
        return res.send(regs.map((reg) => ({
            username: reg.username,
            nickname: reg.nickname,
            registerTime: reg.registerTime
        })));
    }).catch((error) => next(error));
};