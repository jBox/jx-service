const { BadRequestError } = require("../../http-errors");

module.exports = (req, res, next) => {
    const { userService } = req.services;
    const { mobile, role } = req.body;

    return userService.create(mobile, role).then((user) =>
        res.send(user)
    ).catch((error) => next(new BadRequestError(error)));
};