module.exports = (req, res, next) => {
    const { userService } = req.services;
    const { mobile } = req.params;

    return userService.deleteDriver(mobile).then(() => {
        return res.send({ mobile });
    }).catch((error) => next(error));
};