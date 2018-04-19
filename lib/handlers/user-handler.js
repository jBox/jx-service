const { ForbiddenError, UnauthorizedError } = require("../http-errors");

module.exports = (...roles) => (req, res, next) => {
    const { rolesService } = req.services;
    const { auth } = req;
    if (!auth) {
        return next(new UnauthorizedError());
    }

    const { user, role } = auth;
    const allowed = user && role === "user" && rolesService.match(roles, user.roles);
    if (allowed) {
        return next();
    }

    return next(new ForbiddenError());
};