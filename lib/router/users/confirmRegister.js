const { BadRequestError } = require("../../http-errors");

module.exports = (req, res, next) => {
    const { userService } = req.services;
    const { mobile, roles } = req.body;

    return userService.create(mobile, roles).then((user) =>
        res.send(user)
    ).catch((error) => next(new BadRequestError(error)));
};