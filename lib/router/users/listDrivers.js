module.exports = (req, res, next) => {
    const { userService } = req.services;
    const filter = (user) => {
        return user.actived && user.roles.includes("driver");
    };
    return userService.find("users", filter).then((drivers) => {
        return res.send(drivers.map((driver) => ({
            mobile: driver.mobile,
            nickname: driver.nickname,
            title: driver.title
        })));
    }).catch((error) => next(error));
};