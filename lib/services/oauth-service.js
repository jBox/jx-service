const request = require("request");
const cv = require("config-vars");
const md5 = require("md5");
const isString = require("lodash/isString");

const tryJson = (text) => {
    if (text && isString(text)) {
        try {
            return JSON.parse(text);
        } catch (ex) {
            console.error(ex);
        }
    }

    return text;
};

class OAuthService {

    secret(secret) {
        const verifySecret = md5(cv.env.wx.appid + cv.env.wx.secret);
        return verifySecret === secret;
    }

    // GET /sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
    token(code) {
        const { appid, secret, apiHost } = cv.env.wx;
        const baseUrl = apiHost;
        const url = "/sns/oauth2/access_token";
        const qs = { appid, secret, code, grant_type: "authorization_code" };
        return new Promise((resolve, reject) => {
            const options = { method: "GET", baseUrl, url, qs };
            request(options, (error, response, body) => {
                if (error) {
                    return reject(error);
                }

                body = tryJson(body);
                const { statusCode } = response;
                switch (statusCode) {
                    case 200:
                        return resolve(body);
                    default:
                        return reject({ ...body, statusCode });
                }
            });
        });
    }

    // GET /sns/userinfo?access_token=ACCESS_TOKEN&openid=OPENID&lang=zh_CN
    userinfo(token, openid) {
        const { apiHost: baseUrl } = cv.env.wx;
        const url = "/sns/userinfo";
        const qs = { access_token: token, openid, lang: "zh_CN" };
        return new Promise((resolve, reject) => {
            const options = { method: "GET", baseUrl, url, qs };
            request(options, (error, response, body) => {
                if (error) {
                    return reject(error);
                }

                body = tryJson(body);
                const { statusCode } = response;
                switch (statusCode) {
                    case 200:
                        return resolve(body);
                    default:
                        return reject({ ...body, statusCode });
                }
            });
        });
    }
}

module.exports = OAuthService;