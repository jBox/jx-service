module.exports = (req, res, next) => {
    const { userService } = req.services;
    const { mobile } = req.params;
    const { nickname, title } = req.body;

    return userService.updateDriver(mobile, { nickname, title }).then((data) => {
        return res.send(data);
    }).catch((error) => next(error));
};