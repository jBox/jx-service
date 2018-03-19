const { UnauthorizedError } = require("../http-errors");

module.exports = (req, res, next) => {
    const id = req.headers["x-auth-id"];
    const role = req.headers["x-role"];

    if (id) {
        const { customerService, userService } = req.services;
        let service = undefined;
        if (role === "customer") {
            service = customerService;
        } else if (role === "user") {
            service = userService;
        }

        if (service) {
            const lookup = service.get(id).catch(() => Promise.resolve());
            return lookup.then((data) => {
                if (data) {
                    req.auth = { [role]: data, role };
                }

                next();
            });
        }
    }

    return next();
};