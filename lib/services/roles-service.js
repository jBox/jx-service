const ROLES = [
    "admin",
    "driver"
];

class RolesService {
    constructor() {
    }

    available(roles) {
        return roles.reduce((verified, role) => {
            return verified && ROLES.includes(role);
        }, true);
    }

    match(roles, targets) {
        return targets.reduce((verified, role) => {
            return verified || roles.includes(role);
        }, false);
    }
}

module.exports = RolesService;