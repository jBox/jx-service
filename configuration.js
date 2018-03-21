const cv = require("config-vars");

module.exports = cv.setup((getenv) => ({
    shareFolder: getenv("JX_SERVICE_SHARE_FOLDER"),
    port: getenv("JX_SERVICE_PORT"),
    jx: {
        certPath: getenv("JX_RSA_CERT_PATH")
    },
    wx: {
        appid: getenv("JX_WX_APP_ID"),
        secret: getenv("JX_WX_APP_SECRET"),
        apiHost: getenv("WX_API_HOST")
    },
    aliyun: {
        accessKey: getenv("ALI_ACC_ID"),
        accessSecret: getenv("ALI_ACC_SEC"),
        sms: {
            signName: getenv("ALI_SMS_SIGN"),
            loginTemplateCode: getenv("ALI_SMS_LOGIN_CODE"),
            registerTemplateCode: getenv("ALI_SMS_REG_CODE"),
            noticeTemplateCode: getenv("ALI_SMS_NOTICE_CODE")
        }
    }
}));