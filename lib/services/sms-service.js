const SMSClient = require("@alicloud/sms-sdk");
const cv = require("config-vars");

class SmsService {
    constructor() {
        const { aliyun } = cv.env;
        const accessKeyId = aliyun.accessKey;
        const secretAccessKey = aliyun.accessSecret;

        // 签名
        this.signName = aliyun.sms.signName;

        //初始化sms_client
        this.client = new SMSClient({ accessKeyId, secretAccessKey });
    }

    orderAccepted(mobileNumber, customer, orderId) {
        // 尊敬的${customer}，您的订单${orderId}已受理。我们将会短信通知您车辆调度信息，请注意查收，谢谢支持。
    }

    orderScheduled(mobileNumber, customer, {
        dateFrom,
        dateTo,
        departure,
        destination,
        licenseNum,
        model,
        driverTitle,
        driverMobile
    }) {
        const date = `${dateFrom}-${dateTo}，从${departure}到${destination}`;
        const vehicle = `${licenseNum}，${model}`;
        const driver = `${driverTitle}，司机电话：${driverMobile}`;
        // 尊敬的${customer}，您于${date}的用车信息如下：车牌${vehicle}，司机${driver}。祝您用车愉快！
    }

    orderChanged(mobileNumber, customer, orderId) {
        // 尊敬的${customer}，您的订单${orderId}已成功变更，稍后我们将以短信方式通知您新的车辆调度信息，请注意查收，谢谢支持！
    }

    orderCancelled(mobileNumber, customer, orderId) {
        // 尊敬的${customer}，您的订单${orderId}已成功取消。谢谢支持！
    }

    registerSuccess(mobileNumber, name) {
        // 尊敬的${name}用户，您的注册信息已通过审核，感谢您的支持！
        const templateCode = cv.env.aliyun.sms.registerSuccessTemplate;
        return this.send(templateCode, mobileNumber, { name });
    }

    registerReject(mobileNumber, name, reason) {
        // 尊敬的${name}用户，由于${reason}，您的注册未通过审核。感谢您的支持！
        const templateCode = cv.env.aliyun.sms.registerFailureTemplate;
        return this.send(templateCode, mobileNumber, { name, reason });
    }

    send(templateCode, mobileNumber, data) {
        //发送短信
        return this.client.sendSMS({
            PhoneNumbers: mobileNumber,
            SignName: this.signName,
            TemplateCode: templateCode,
            TemplateParam: JSON.stringify(data)
        }).then((res) => {
            const { Code } = res;
            if (Code === "OK") {
                //处理返回参数
                return true;
            }

            console.error("SMS send failed.", res);
            return false;
        }, (err) => {
            console.error("SMS send failed.", err);
            return Promise.resolve(false);
        });
    }
}

module.exports = SmsService;