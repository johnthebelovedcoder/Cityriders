"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAction = exports.ExpenseCategory = exports.PaymentStatus = exports.PaymentMethod = exports.FailedDeliveryReason = exports.ProofOfDeliveryType = exports.RiderStatus = exports.PackageStatus = exports.UserStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMINISTRATOR"] = "ADMINISTRATOR";
    UserRole["MANAGER"] = "MANAGER";
    UserRole["ACCOUNTANT"] = "ACCOUNTANT";
    UserRole["DISPATCHER"] = "DISPATCHER";
    UserRole["RIDER"] = "RIDER";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["INACTIVE"] = "INACTIVE";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var PackageStatus;
(function (PackageStatus) {
    PackageStatus["REGISTERED"] = "REGISTERED";
    PackageStatus["AWAITING_ASSIGNMENT"] = "AWAITING_ASSIGNMENT";
    PackageStatus["ASSIGNED"] = "ASSIGNED";
    PackageStatus["PICKED_UP"] = "PICKED_UP";
    PackageStatus["IN_TRANSIT"] = "IN_TRANSIT";
    PackageStatus["DELIVERY_ATTEMPTED"] = "DELIVERY_ATTEMPTED";
    PackageStatus["DELIVERED"] = "DELIVERED";
    PackageStatus["RETURNED"] = "RETURNED";
    PackageStatus["CANCELLED"] = "CANCELLED";
})(PackageStatus || (exports.PackageStatus = PackageStatus = {}));
var RiderStatus;
(function (RiderStatus) {
    RiderStatus["ACTIVE"] = "ACTIVE";
    RiderStatus["INACTIVE"] = "INACTIVE";
})(RiderStatus || (exports.RiderStatus = RiderStatus = {}));
var ProofOfDeliveryType;
(function (ProofOfDeliveryType) {
    ProofOfDeliveryType["SIGNATURE"] = "SIGNATURE";
    ProofOfDeliveryType["PHOTO"] = "PHOTO";
    ProofOfDeliveryType["OTP_CODE"] = "OTP_CODE";
    ProofOfDeliveryType["RECIPIENT_NAME"] = "RECIPIENT_NAME";
})(ProofOfDeliveryType || (exports.ProofOfDeliveryType = ProofOfDeliveryType = {}));
var FailedDeliveryReason;
(function (FailedDeliveryReason) {
    FailedDeliveryReason["RECIPIENT_NOT_AVAILABLE"] = "RECIPIENT_NOT_AVAILABLE";
    FailedDeliveryReason["WRONG_ADDRESS"] = "WRONG_ADDRESS";
    FailedDeliveryReason["REFUSED_DELIVERY"] = "REFUSED_DELIVERY";
    FailedDeliveryReason["ACCESS_ISSUE"] = "ACCESS_ISSUE";
    FailedDeliveryReason["OTHER"] = "OTHER";
})(FailedDeliveryReason || (exports.FailedDeliveryReason = FailedDeliveryReason = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["POS"] = "POS";
    PaymentMethod["ONLINE"] = "ONLINE";
    PaymentMethod["OTHER"] = "OTHER";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["COMPLETED"] = "COMPLETED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
    PaymentStatus["CANCELLED"] = "CANCELLED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var ExpenseCategory;
(function (ExpenseCategory) {
    ExpenseCategory["FUEL"] = "FUEL";
    ExpenseCategory["MAINTENANCE"] = "MAINTENANCE";
    ExpenseCategory["RIDER_COMPENSATION"] = "RIDER_COMPENSATION";
    ExpenseCategory["OFFICE"] = "OFFICE";
    ExpenseCategory["MARKETING"] = "MARKETING";
    ExpenseCategory["OTHER"] = "OTHER";
})(ExpenseCategory || (exports.ExpenseCategory = ExpenseCategory = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["ASSIGN"] = "ASSIGN";
    AuditAction["REASSIGN"] = "REASSIGN";
    AuditAction["STATUS_CHANGE"] = "STATUS_CHANGE";
    AuditAction["LOGIN"] = "LOGIN";
    AuditAction["LOGOUT"] = "LOGOUT";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
