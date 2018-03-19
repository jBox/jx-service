const { ForbiddenError, UnauthorizedError } = require("../http-errors");

module.exports = (...roles) => (req, res, next) => {
    const { auth } = req;
    if (auth) {
        if (roles.includes(auth.role)) {
            return next();
        }

        return next(new ForbiddenError());
    }

    return next(new UnauthorizedError());
};