const statusCodes = require("http").STATUS_CODES;
const statuses = require("statuses");
const inherits = require("util").inherits;

/**
 * HTTP errors
 *
BadRequestError
UnauthorizedError
PaymentRequiredError
ForbiddenError
NotFoundError
MethodNotAllowedError
NotAcceptableError
ProxyAuthenticationRequiredError
RequestTimeoutError
ConflictError
GoneError
LengthRequiredError
PreconditionFailedError
PayloadTooLargeError
URITooLongError
UnsupportedMediaTypeError
RangeNotSatisfiableError
ExpectationFailedError
ImateapotError
MisdirectedRequestError
UnprocessableEntityError
LockedError
FailedDependencyError
UnorderedCollectionError
UpgradeRequiredError
PreconditionRequiredError
TooManyRequestsError
RequestHeaderFieldsTooLargeError
UnavailableForLegalReasonsError
InternalServerErrorError
NotImplementedError
BadGatewayError
ServiceUnavailableError
GatewayTimeoutError
HTTPVersionNotSupportedError
VariantAlsoNegotiatesError
InsufficientStorageError
LoopDetectedError
BandwidthLimitExceededError
NotExtendedError
NetworkAuthenticationRequiredError

 */

function createError(status, code, name) {
    return function (message) {
        Error.captureStackTrace(this, this.constructor);
        this.name = name;
        this.message = message;
        this.statusCode = code;
        this.status = status;
    }
}

Object.keys(statusCodes)
    .filter(code => code >= 400)
    .forEach(code => {
        const name = statusCodes[code]
            .replace(/\W/g, "")
            .concat("Error");
        const httpError = createError(statuses[code], Number(code), name);
        inherits(httpError, Error);
        exports[name] = httpError;
    });