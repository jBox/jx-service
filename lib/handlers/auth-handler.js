const { UnauthorizedError } = require("../http-errors");

module.exports = (req, res, next) => {
    const auth = req.user;
    const now = Math.floor(Date.now() / 1000);
    if (auth && auth.exp > now) {
        return next();
    }

    return next(new UnauthorizedError());
}