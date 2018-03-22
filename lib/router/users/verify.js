const { isUsernameValid, isPasswordValid } = require("./utils");

module.exports = (req, res, next) => {
    const { userService } = req.services;
    const { username, password } = req.body;
    if (!isUsernameValid(username) || !isPasswordValid(password)) {
        return res.send(false);
    }

    return userService.verify(username, password).then((verified) =>
        res.send(verified)
    ).catch((error) => res.send(false));
};