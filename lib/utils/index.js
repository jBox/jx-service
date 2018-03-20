const ContentType = require("content-type");

module.exports.validateVehicleNumber = (number) => {
    if (number.length === 7) {
        const express = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-Z0-9]{4}[A-Z0-9挂学警港澳]{1}$/;
        return express.test(number);
    }

    return false;
};

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