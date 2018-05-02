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
            registerSuccessTemplate: getenv("ALI_SMS_REGISTER_SUCCESS_TEMPLATE"),
            registerFailureTemplate: getenv("ALI_SMS_REGISTER_FAILURE_TEMPLATE"),
            orderScheduledTemplate: getenv("ALI_SMS_ORDER_SCHEDULED_TEMPLATE"),
            orderCancelledTemplate: getenv("ALI_SMS_ORDER_CANCELLED_TEMPLATE"),
            orderChangedTemplate: getenv("ALI_SMS_ORDER_CHANGED_TEMPLATE"),
            orderAcceptedTemplate: getenv("ALI_SMS_ORDER_ACCEPTED_TEMPLATE"),
            orderCreatedTemplate: getenv("ALI_SMS_ORDER_CREATED_TEMPLATE"),
            orderCompletedTemplate: getenv("ALI_SMS_ORDER_COMPLETED_TEMPLATE"),
            driverScheduledTemplate: getenv("ALI_SMS_DRIVER_SCHEDULED_TEMPLATE"),
            driverScheduleCancelledTemplate: getenv("ALI_SMS_DRIVER_SCHEDULE_CANCELLED_TEMPLATE")
        }
    }
}));