const request = require("request");

class OAuthService {
    constructor() {
        this.openTokenApiHost = "http://localhost:3000";
        // this.openTokenApiHost = https://api.weixin.qq.com;
    }

    // GET /sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
    token(appid, secret, code) {
        const baseUrl = this.openTokenApiHost;
        const url = "/sns/oauth2/access_token";
        const qs = { appid, secret, code, grant_type: "authorization_code" };
        return new Promise((resolve, reject) => {
            const options = { method: "GET", baseUrl, url, qs };
            request(options, (error, response, body) => {
                if (error) {
                    return reject(error);
                }

                if (typeof body === "string") {
                    body = JSON.parse(body);
                }

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
        const baseUrl = this.openTokenApiHost;
        const url = "/sns/userinfo";
        const qs = { access_token: token, openid, lang: "zh_CN" };
        return new Promise((resolve, reject) => {
            const options = { method: "GET", baseUrl, url, qs };
            request(options, (error, response, body) => {
                if (error) {
                    return reject(error);
                }

                if (typeof body === "string") {
                    body = JSON.parse(body);
                }

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