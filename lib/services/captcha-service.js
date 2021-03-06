const level = require("level");
const Path = require("path")
const fs = require("fs-extra");
const SMSClient = require("@alicloud/sms-sdk");
const cv = require("config-vars");
const SmsService = require("./sms-service");

class SmsSender {
    constructor(category) {
        const { aliyun } = cv.env;
        this.templateCode = aliyun.sms[category + "TemplateCode"];
        this.service = new SmsService();
    }

    send(mobile, code) {
        //发送短信
        return this.service.send(this.templateCode, mobile, { code });
    }
}

const db = { login: null, register: null, code: null };

const expiresAt = (expiresIn) => {
    const now = new Date();
    now.setSeconds(now.getSeconds() + Number(expiresIn));
    return now.getTime();
};

const generateCode = (digit) => {
    const r = () => Math.floor(Math.random() * 10);
    const codes = [];
    for (let i = 0; i < digit; i++) {
        codes.push(r());
    }

    const code = codes.join("");
    if (process.env.NODE_ENV !== "production") {
        console.log("vCode: ", code);
    }

    return { code };
};

class CaptchaService {
    constructor(dataDir) {
        const DB_DIR = Path.resolve(dataDir, "./db");
        const CAPTCHAS_DIR = Path.resolve(DB_DIR, "./captchas");
        fs.ensureDirSync(DB_DIR);
        fs.ensureDirSync(CAPTCHAS_DIR);

        const LOG_DB = Path.resolve(CAPTCHAS_DIR, "./login");
        const REG_DB = Path.resolve(CAPTCHAS_DIR, "./register");
        const COD_DB = Path.resolve(CAPTCHAS_DIR, "./code");
        if (!db.login) {
            db.login = level(LOG_DB);
        }
        if (!db.register) {
            db.register = level(REG_DB);
        }
        if (!db.code) {
            db.code = level(COD_DB);
        }
    }

    generate(identity, { category, digit, expiresIn }) {
        const instance = db[category];
        const exists = instance.get(identity)
            .then((data) => JSON.parse(data))
            .then((captcha) => {
                const now = Date.now();
                if (captcha.expiresAt > now) {
                    return captcha;
                }

                return generateCode(digit);
            })
            .catch((error) => {
                if (error.notFound) {
                    return Promise.resolve(generateCode(digit));
                }

                return Promise.reject(error);
            });

        return exists.then((captcha) => {
            const sender = new SmsSender(category);
            return sender.send(identity, captcha.code).then(() => {
                captcha.expiresAt = expiresAt(expiresIn);
                const data = JSON.stringify(captcha);
                return instance.put(identity, data);
            }).catch((error) => {
                captcha.expiresAt = 0;
                const data = JSON.stringify(captcha);
                return instance.put(identity, data).then(() => Promise.reject(error));
            });
        });
    }

    peek(category, identity, code) {
        const instance = db[category];
        const now = Date.now();
        return instance.get(identity)
            .then((data) => JSON.parse(data))
            .then((captcha) => {
                if (captcha.expiresAt >= now) {
                    return captcha.code === code;
                }

                return Promise.reject(false);
            }).catch((error) => {
                if (error.notFound) {
                    return Promise.reject(false);
                }

                return Promise.reject(error);
            });
    }

    verify(category, identity, code) {
        const instance = db[category];
        return this.peek(category, identity, code)
            .then((verified) => instance.put(identity, JSON.stringify({ expiresAt: 0 }))
                .then(() => verified)
                .catch(() => Promise.resolve(verified)));
    }
}

module.exports = CaptchaService;