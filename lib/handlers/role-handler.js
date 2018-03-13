const { ForbiddenError, UnauthorizedError } = require("../http-errors");

module.exports = (role) => (req, res, next) => {
    const { auth } = req;
    if (auth) {
        if (auth.role === role) {
            return next();
        }

        return next(new ForbiddenError());
    }

    return next(new UnauthorizedError());
};