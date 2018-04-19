const isUndefined = require("lodash/isUndefined");
const { NotFoundError, BadRequestError } = require("../../http-errors");
const { validateContentType } = require("../../utils");
const updators = require("./updators");

const validateUpdateOperation = (req, res, next) => {
    const { user } = req.auth;

    if (user) {
        return userOperation(req, res, next);
    }

    return next(new BadRequestError());
};

const userOperation = (req, res, next) => {
    const { operation } = req.body;
    const { user } = req.auth;

    if (user.roles.includes("admin") || user.roles.includes("super")) {
        const Allowed_Operations = [
            "confirm", "modify",
            "schedule", "confirmcan",
            "executecan", "complete"
        ];

        if (Allowed_Operations.includes(operation)) {
            return next();
        }
    }

    return next(new BadRequestError());
};

const update = (req, res, next) => {
    const { operation } = req.body;
    return updators.get(operation).update(req, res, next).then((data) => {
        return res.send(data);
    }).catch((error) => {
        return next(error);
    });
};

module.exports = [
    validateContentType("application/json"),
    validateUpdateOperation,
    update
];