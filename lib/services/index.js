const OrderService = require("./order-service");
const CustomerService = require("./customer-service");
const UserService = require("./user-service");
const OAuthService = require("./oauth-service");
const VehicleService = require("./vehicle-service");
const CaptchaService = require("./captcha-service");
const RolesService = require("./roles-service");
const SmsService = require("./sms-service");
const ImageService = require("./image-service");

module.exports = (dataDir) => {
    const services = {
        DATA_DIR: dataDir,
        orderService: new OrderService(dataDir),
        customerService: new CustomerService(dataDir),
        userService: new UserService(dataDir),
        rolesService: new RolesService(),
        oauthService: new OAuthService(),
        smsService: new SmsService(),
        vehicleService: new VehicleService(dataDir),
        captchaService: new CaptchaService(dataDir),
        imageService: new ImageService(dataDir)
    };

    return (req, res, next) => {
        req.services = services;
        next();
    };
};