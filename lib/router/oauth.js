const { validateMobileNumber, isUsernameValid } = require("../utils");
const isUndefined = require("lodash/isUndefined");
const { BadRequestError, NotFoundError, UnauthorizedError } = require("../http-errors");

const express = require("express");
const router = express.Router();

/* POST authorize */
router.post("/authorize", (req, res, next) => {
    const { customerService, oauthService } = req.services;
    const { secret, type } = req.body;

    // validate secret
    if (type === "authorization_code" && oauthService.secret(secret)) {
        const { code } = req.body;
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
    } else if (type === "user") {
        const { userService } = req.services;
        const { mobile, username, password } = req.body;
        let validator = null;
        if (validateMobileNumber(mobile)) {
            validator = userService.verifyMobile(mobile);
        } else if (isUsernameValid(username)) {
            validator = userService.verifyUsername(username, password);
        }

        if (validator) {
            return validator.then((data) => res.send(data)).catch(() => next(new UnauthorizedError()));
        }
    }

    return next(new BadRequestError());
});

router.get("/users/:identity", (req, res, next) => {
    const { userService } = req.services;
    const { identity } = req.params;

    return userService.lookup(identity).then((user) =>
        res.send(user)
    ).catch(() => next(new NotFoundError()))
});

module.exports = {
    baseUrl: "/oauth",
    router
};