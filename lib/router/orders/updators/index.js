const { BadRequestError } = require("../../../http-errors");

const modify = require("./modify");
const cancel = require("./cancel");
const del = require("./del");
const confirmcan = require("./confirmcan");
const complete = require("./complete");
const confirm = require("./confirm");
const schedule = require("./schedule");
const executecan = require("./executecan");

const updators = {
    modify,
    cancel,
    del,
    confirmcan,
    complete,
    confirm,
    schedule,
    executecan
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