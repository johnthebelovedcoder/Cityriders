export declare enum UserRole {
    ADMINISTRATOR = "ADMINISTRATOR",
    MANAGER = "MANAGER",
    ACCOUNTANT = "ACCOUNTANT",
    DISPATCHER = "DISPATCHER",
    RIDER = "RIDER"
}
export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE"
}
export declare enum PackageStatus {
    REGISTERED = "REGISTERED",
    AWAITING_ASSIGNMENT = "AWAITING_ASSIGNMENT",
    ASSIGNED = "ASSIGNED",
    PICKED_UP = "PICKED_UP",
    IN_TRANSIT = "IN_TRANSIT",
    DELIVERY_ATTEMPTED = "DELIVERY_ATTEMPTED",
    DELIVERED = "DELIVERED",
    RETURNED = "RETURNED",
    CANCELLED = "CANCELLED"
}
export declare enum RiderStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE"
}
export declare enum ProofOfDeliveryType {
    SIGNATURE = "SIGNATURE",
    PHOTO = "PHOTO",
    OTP_CODE = "OTP_CODE",
    RECIPIENT_NAME = "RECIPIENT_NAME"
}
export declare enum FailedDeliveryReason {
    RECIPIENT_NOT_AVAILABLE = "RECIPIENT_NOT_AVAILABLE",
    WRONG_ADDRESS = "WRONG_ADDRESS",
    REFUSED_DELIVERY = "REFUSED_DELIVERY",
    ACCESS_ISSUE = "ACCESS_ISSUE",
    OTHER = "OTHER"
}
export declare enum PaymentMethod {
    CASH = "CASH",
    BANK_TRANSFER = "BANK_TRANSFER",
    POS = "POS",
    ONLINE = "ONLINE",
    OTHER = "OTHER"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    REFUNDED = "REFUNDED",
    CANCELLED = "CANCELLED"
}
export declare enum ExpenseCategory {
    FUEL = "FUEL",
    MAINTENANCE = "MAINTENANCE",
    RIDER_COMPENSATION = "RIDER_COMPENSATION",
    OFFICE = "OFFICE",
    MARKETING = "MARKETING",
    OTHER = "OTHER"
}
export declare enum AuditAction {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
    ASSIGN = "ASSIGN",
    REASSIGN = "REASSIGN",
    STATUS_CHANGE = "STATUS_CHANGE",
    LOGIN = "LOGIN",
    LOGOUT = "LOGOUT"
}
//# sourceMappingURL=enums.d.ts.map