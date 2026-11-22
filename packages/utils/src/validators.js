"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRiderSchema = exports.createCustomerSchema = exports.createPackageSchema = exports.createUserSchema = exports.loginSchema = exports.dateRangeSchema = exports.paginationSchema = exports.addressSchema = exports.passwordSchema = exports.phoneSchema = exports.emailSchema = void 0;
const zod_1 = require("zod");
exports.emailSchema = zod_1.z.string().email('Invalid email address');
exports.phoneSchema = zod_1.z
    .string()
    .min(7, 'Phone number too short')
    .max(20, 'Phone number too long')
    .regex(/^\+?[\d\s\-().]+$/, 'Invalid phone number');
exports.passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number');
exports.addressSchema = zod_1.z.object({
    street: zod_1.z.string().min(1, 'Street is required'),
    city: zod_1.z.string().min(1, 'City is required'),
    state: zod_1.z.string().optional(),
    country: zod_1.z.string().min(1, 'Country is required'),
    postalCode: zod_1.z.string().optional(),
    landmark: zod_1.z.string().optional(),
});
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
exports.dateRangeSchema = zod_1.z.object({
    dateFrom: zod_1.z.string().datetime().optional(),
    dateTo: zod_1.z.string().datetime().optional(),
});
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.createUserSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(100),
    lastName: zod_1.z.string().min(1).max(100),
    email: exports.emailSchema,
    phone: exports.phoneSchema.optional(),
    password: exports.passwordSchema,
    role: zod_1.z.enum(['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'DISPATCHER', 'RIDER']),
});
exports.createPackageSchema = zod_1.z.object({
    description: zod_1.z.string().max(500).optional(),
    weight: zod_1.z.number().positive().optional(),
    declaredValue: zod_1.z.number().nonnegative().optional(),
    deliveryFee: zod_1.z.number().nonnegative().optional(),
    specialInstructions: zod_1.z.string().max(1000).optional(),
    senderId: zod_1.z.string().cuid('Invalid sender ID'),
    recipientId: zod_1.z.string().cuid('Invalid recipient ID'),
    originAddress: exports.addressSchema,
    destinationAddress: exports.addressSchema,
});
exports.createCustomerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    phone: exports.phoneSchema,
    email: exports.emailSchema.optional(),
    address: zod_1.z.string().max(500).optional(),
});
exports.createRiderSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(100),
    lastName: zod_1.z.string().min(1).max(100),
    email: exports.emailSchema,
    phone: exports.phoneSchema,
    password: exports.passwordSchema,
    riderId: zod_1.z.string().optional(),
    vehicleType: zod_1.z.string().optional(),
    vehiclePlate: zod_1.z.string().optional(),
});
