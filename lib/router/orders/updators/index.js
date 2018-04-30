const { BadRequestError } = require("../../../http-errors");

const modify = require("./modify");
const confirmcan = require("./confirmcan");
const complete = require("./complete");
const confirm = require("./confirm");
const schedule = require("./schedule");
const executecan = require("./executecan");
const depart = require("./depart");
const progress = require("./progress");

const updators = {
    modify,
    confirmcan,
    complete,
    confirm,
    schedule,
    executecan,
    depart,
    progress
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