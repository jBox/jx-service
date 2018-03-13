const statuses = require("statuses");
const production = process.env.NODE_ENV === "production";

const InternalServerErrorCode = 500;

module.exports = (logger) => (err, req, res, next) => {
    let status = err.statusCode || InternalServerErrorCode;
    if (status < 400) {
        status = InternalServerErrorCode;
    }

    res.statusCode = status;

    const body = {
        status: status,
        statusText: statuses[status],
        message: err.message ? err.message : statuses[status]
    };

    // show the stacktrace when not in production
    if (!production) {
        body.stack = err.stack;
    }

    if (err.name) {
        body.name = err.name;
    } else {
        body.name = body.statusText.replace(/\W/g, "").concat("Error");
    }

    if (err.code) {
        body.code = err.code;
    }

    if (err.type) {
        body.type = err.type;
    }

    // internal server errors
    if (status >= InternalServerErrorCode) {
        console.error(err.stack);
        body.id = logger.error(err);
        return res.json(body);
    }

    return res.json(body);
};