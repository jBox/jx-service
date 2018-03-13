const isUndefined = require("lodash/isUndefined");
const { BadRequestError, NotFoundError } = require("../http-errors");

const express = require("express");
const router = express.Router();

/* POST authorize */
router.post("/authorize", (req, res, next) => {
    const { customerService, oauthService } = req.services;
    const { code, secret, type } = req.body;

    if (type === "authorization_code") {
        // validate secret
        // ...

        // get token
        return oauthService.token("appid", "secret", code).then((token) => {
            // call wx authorize api and get openid
            const openid = token.openid; //"109123847015";
            return customerService.get(openid).then((customer) => {
                if (isUndefined(customer)) {
                    // get usreinfo to create customer
                    if (token.scope === "snsapi_userinfo") {
                        return oauthService.userinfo(token.access_token, token.openid).then((userinfo) => {
                            const { openid, ...baseinfo } = userinfo;
                            customerService.put({
                                ...baseinfo,
                                id: openid,
                                token
                            }).then((user) => {
                                return res.send(user);
                            })
                        });
                    }

                    return next(new NotFoundError("Data Not Fonud"));
                }

                return res.send(customer);
            }).catch((error) => {
                return next(error);
            });
        })
    }

    return next(new BadRequestError());
});


module.exports = {
    baseUrl: "/oauth",
    router
};