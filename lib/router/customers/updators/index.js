const { BadRequestError } = require("../../../http-errors");

const cancel = require("./cancel");
const del = require("./del");

const updators = {
    cancel,
    del
};

module.exports = {
    get(operation) {
        const updator = updators[operation];
        if (updator) {
            return { update: updator };
        }

        return { update: () => Promise.reject(new BadRequestError("Operation is invalid.")) };
    }
};