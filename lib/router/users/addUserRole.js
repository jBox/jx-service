module.exports = (req, res, next) => {
    const { userService } = req.services;
    const { identity, role } = req.params;

    return userService.get(identity).then((user) => {
        const roles = [...user.roles];
        const index = roles.indexOf(role);
        if (index !== -1) {
            return res.send(user);
        }

        roles.push(role);
        return userService.updateRoles(identity, roles).then((data) => {
            return res.send(data);
        });
    }).catch((error) => next(error));
};