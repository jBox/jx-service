const { BadRequestError } = require("../http-errors");

const express = require("express");
const router = express.Router();

/* POST authorize */
router.post("/authorize", (req, res, next) => {
    const { customerService } = req.services;
    const { code, secret, type } = req.body;

    if (type === "authorization_code") {
        // call wx authorize api and get openid
        const openid = "109123847015";
        return customerService.get(openid).then((customer) => {
            return res.send({
                ...customer,
                token: { access_token: "access_token" }
            });
        }).catch((error) => {
            return next(error);
        });
    }

    return next(new BadRequestError());
});


module.exports = {
    baseUrl: "/oauth",
    router
};