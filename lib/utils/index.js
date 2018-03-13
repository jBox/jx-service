const ContentType = require("content-type");

module.exports.validateContentType = (contentTypeValue) => (req, res, next) => {
    const reg = new RegExp(`^${contentTypeValue}$`, "ig");
    const contentTypeHeader = req.headers["content-type"];
    const contentType = contentTypeHeader ? ContentType.parse(contentTypeHeader) : "";
    const isValid = contentType && reg.test(contentType.type);
    if (isValid) {
        return next();
    }

    return next(new BadRequestError("Content-Type is invalid."));
};

module.exports.fixNum = (num, length) => {
    return ("" + num).length < length ? ((new Array(length + 1)).join("0") + num).slice(-length) : "" + num;
};