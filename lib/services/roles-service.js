const ROLES = {
    "admin": "管理员",
    "dispatcher": "调度员",
    "driver": "司机"
};

const ROLE_NAME_LIST = Object.keys(ROLES);

class RolesService {
    constructor() {
    }

    available(roles) {
        return roles.reduce((verified, role) => {
            return verified && ROLE_NAME_LIST.includes(role);
        }, true);
    }

    match(roles, targets) {
        return targets.reduce((verified, role) => {
            return verified || roles.includes(role);
        }, false);
    }

    roles() {
        return { ...ROLES };
    }
}

module.exports = RolesService;