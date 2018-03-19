const { ForbiddenError, UnauthorizedError } = require("../http-errors");

module.exports = (...roles) => (req, res, next) => {
    const { auth } = req;
    if (!auth) {
        return next(new UnauthorizedError());
    }

    const allowed = auth.user &&
        auth.role === "user" &&
        roles.includes(auth.user.role);

    if (!allowed) {
        return next(new ForbiddenError());
    }

    return next();
};