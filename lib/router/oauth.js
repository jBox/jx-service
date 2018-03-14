const isUndefined = require("lodash/isUndefined");
const { BadRequestError, NotFoundError } = require("../http-errors");

const express = require("express");
const router = express.Router();

/* POST authorize */
router.post("/authorize", (req, res, next) => {
    const { customerService, oauthService } = req.services;
    const { secret, code, type } = req.body;

    // validate secret
    if (type === "authorization_code" && oauthService.secret(secret)) {
        // get token
        return oauthService.token(code).then((token) => {
            // call wx authorize api and get openid
            const openid = token.openid;
            return customerService.get(openid).then((customer) => {
                if (isUndefined(customer)) {
                    // create customer
                    return customerService.put({
                        id: openid,
                        token,
                        orders: []
                    }).then((user) => res.send({ id: openid }));
                }

                return res.send({ id: openid });
            }).catch((error) => next(error));
        });
    }

    return next(new BadRequestError());
});


module.exports = {
    baseUrl: "/oauth",
    router
};