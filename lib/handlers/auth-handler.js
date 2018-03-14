const { UnauthorizedError } = require("../http-errors");

module.exports = (req, res, next) => {
    const { auth } = req;
    if (auth) {
        return next();
    }

    return next(new UnauthorizedError());
}