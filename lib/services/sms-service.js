const SMSClient = require("@alicloud/sms-sdk");
const cv = require("config-vars");

class SmsService {
    constructor() {
        const { aliyun } = cv.env;
        const accessKeyId = aliyun.accessKey;
        const secretAccessKey = aliyun.accessSecret;

        // 签名
        this.signName = aliyun.sms.signName;

        this.templates = aliyun.sms;

        //初始化sms_client
        this.client = new SMSClient({ accessKeyId, secretAccessKey });
    }

    orderCreated(mobileNumber, orderId) {
        // 接到订单${orderId}，请及时处理。
        const templateCode = this.templates.orderCreatedTemplate;
        return this.send(templateCode, mobileNumber, { orderId });
    }

    orderAccepted(mobileNumber, customer, orderId) {
        // 尊敬的${customer}，您的订单${orderId}已受理。我们将会短信通知您车辆调度信息，请注意查收，谢谢支持。
        const templateCode = this.templates.orderAcceptedTemplate;
        return this.send(templateCode, mobileNumber, { customer, orderId });
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
        const date = `${dateFrom} 至 ${dateTo}`;
        const vehicle = `${licenseNum}`;
        const driver = `${driverTitle}，${driverMobile}`;
        // 尊敬的${customer}，您于${date}的用车信息如下：车牌${vehicle}，司机${driver}。祝您用车愉快！
        const templateCode = this.templates.orderScheduledTemplate;
        return this.send(templateCode, mobileNumber, { customer, driver, date, vehicle });
    }

    driverScheduled(mobileNumber, driver, {
        dateFrom,
        dateTo,
        departure,
        destination,
        licenseNum
    }) {
        const date = `${dateFrom} 至 ${dateTo}`;
        const vehicle = `${licenseNum}`;
        // 尊敬的${driver}，您于${date}的出车已安排，车牌号（${vehicle}）。请提前联系客户。
        const templateCode = this.templates.driverScheduledTemplate;
        return this.send(templateCode, mobileNumber, { driver, date, vehicle });
    }

    driverScheduleCancelled(mobileNumber, {
        dateFrom,
        dateTo,
        licenseNum
    }) {
        const date = `${dateFrom} 至 ${dateTo}`;
        const vehicle = `${licenseNum}`;
        // 您于${date}的出车已被取消，车牌号${vehicle}。特此通知。
        const templateCode = this.templates.driverScheduleCancelledTemplate;
        return this.send(templateCode, mobileNumber, { date, vehicle });
    }

    orderChanged(mobileNumber, customer, orderId) {
        // 尊敬的${customer}，您的订单${orderId}已成功变更，稍后我们将以短信方式通知您新的车辆调度信息，请注意查收，谢谢支持！
        const templateCode = this.templates.orderChangedTemplate;
        return this.send(templateCode, mobileNumber, { customer, orderId });
    }

    orderCancelled(mobileNumber, customer, orderId) {
        // 尊敬的${customer}，您的订单${orderId}已成功取消。谢谢支持！
        const templateCode = this.templates.orderCancelledTemplate;
        return this.send(templateCode, mobileNumber, { customer, orderId });
    }

    registerSuccess(mobileNumber, name) {
        // 尊敬的${name}用户，您的注册信息已通过审核，感谢您的支持！
        const templateCode = this.templates.registerSuccessTemplate;
        return this.send(templateCode, mobileNumber, { name });
    }

    registerReject(mobileNumber, name, reason) {
        // 尊敬的${name}用户，由于${reason}，您的注册未通过审核。感谢您的支持！
        const templateCode = this.templates.registerFailureTemplate;
        return this.send(templateCode, mobileNumber, { name, reason });
    }

    send(templateCode, mobileNumber, data, count = 0) {
        if (process.env.NODE_ENV !== "production") {
            return Promise.resolve(true);
        }

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
            if (count < 3) {
                console.log("SMS re-try:", templateCode, mobileNumber, data);
                return this.send(templateCode, mobileNumber, data, ++count);
            }
        }, (err) => {
            console.error("SMS send error.", err);
            return Promise.resolve(false);
        });
    }
}

module.exports = SmsService;