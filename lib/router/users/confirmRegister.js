const { BadRequestError } = require("../../http-errors");

module.exports = (req, res, next) => {
    const { userService } = req.services;
    const { username, role } = req.body;

    return userService.create(username, role).then((user) =>
        res.send(user)
    ).catch((error) => next(new BadRequestError(error)));
};