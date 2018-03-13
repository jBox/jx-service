const { UnauthorizedError } = require("../http-errors");

module.exports = (req, res, next) => {
    const id = req.headers["x-auth-id"];
    const role = req.headers["x-role"];

    if (id) {
        const { customerService, userSerivce } = req.services;
        let service = undefined;
        if (role === "customer") {
            service = customerService;
        } else if (role === "user") {
            service = userSerivce;
        }

        if (service) {
            const lookup = service.get(id).catch(() => Promise.resolve(undefined));
            return lookup.then((data) => {
                req.auth = { [role]: data, role };
                next();
            });
        }
    }

    return next();
};