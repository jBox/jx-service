const { ForbiddenError, UnauthorizedError } = require("../http-errors");

module.exports = (...roles) => (req, res, next) => {
    const { rolesService } = req.services;
    const { auth } = req;
    if (!auth) {
        return next(new UnauthorizedError());
    }

    const allowed = auth.user &&
        auth.role === "user" &&
        rolesService.match(roles, auth.user.roles);

    if (allowed) {
        return next();
    }

    return next(new ForbiddenError());
};