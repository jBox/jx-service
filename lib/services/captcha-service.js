const level = require("level");
const Path = require("path")
const fs = require("fs-extra");

const db = { instance: null };

const expiresAt = (expiresIn) => {
    const now = new Date();
    now.setSeconds(now.getSeconds() + Number(expiresIn));
    return now.getTime();
};

const generateCode = ({ expiresIn }) => {
    const r = () => Math.floor(Math.random() * 10);
    const codes = [r(), r(), r(), r(), r(), r()];

    return { expiresAt: expiresAt(expiresIn), code: codes.join("") };
};

class CaptchaService {
    constructor(dataDir) {
        const DB_DIR = Path.resolve(dataDir, "./db");
        fs.ensureDirSync(DB_DIR);

        const CAPTCHAS_DB = Path.resolve(DB_DIR, "./captchas");
        if (!db.instance) {
            db.instance = level(CAPTCHAS_DB);
        }
    }

    get(mobile) {
        return db.instance.get(mobile)
            .then((data) => JSON.parse(data))
            .then((captcha) => {
                const now = Date.now();
                if (captcha.expiresAt > now) {
                    return captcha.code;
                }

                return undefined;
            })
            .catch((error) => {
                if (/^notfounderror/ig.test(error.type)) {
                    return Promise.resolve();
                }

                return Promise.reject(error);
            });
    }

    generate(mobile, options) {
        return this.get(mobile).then((code) => {
            const captcha = generateCode(options);
            if (code) {
                captcha.code = code;
            }

            const data = JSON.stringify(captcha);
            return db.instance.put(mobile, data).then(() => captcha.code);
        });
    }
}

module.exports = CaptchaService;