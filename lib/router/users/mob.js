const { validateMobileNumber } = require("./utils");

module.exports = (req, res, next) => {
    const { userService } = req.services;
    const { mobile } = req.params;

    if (!validateMobileNumber(mobile)) {
        return res.send(false);
    }

    return userService.mob(mobile).then((verified) =>
        res.send(verified)
    ).catch((error) => res.send(false));
};