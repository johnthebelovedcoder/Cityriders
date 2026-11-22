import { z } from 'zod';
export declare const emailSchema: z.ZodString;
export declare const phoneSchema: z.ZodString;
export declare const passwordSchema: z.ZodString;
export declare const addressSchema: z.ZodObject<{
    street: z.ZodString;
    city: z.ZodString;
    state: z.ZodOptional<z.ZodString>;
    country: z.ZodString;
    postalCode: z.ZodOptional<z.ZodString>;
    landmark: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    street: string;
    city: string;
    country: string;
    state?: string | undefined;
    postalCode?: string | undefined;
    landmark?: string | undefined;
}, {
    street: string;
    city: string;
    country: string;
    state?: string | undefined;
    postalCode?: string | undefined;
    landmark?: string | undefined;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
}, {
    page?: number | undefined;
    limit?: number | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const dateRangeSchema: z.ZodObject<{
    dateFrom: z.ZodOptional<z.ZodString>;
    dateTo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
}, {
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const createUserSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    role: z.ZodEnum<["ADMINISTRATOR", "MANAGER", "ACCOUNTANT", "DISPATCHER", "RIDER"]>;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: "ADMINISTRATOR" | "MANAGER" | "ACCOUNTANT" | "DISPATCHER" | "RIDER";
    phone?: string | undefined;
}, {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: "ADMINISTRATOR" | "MANAGER" | "ACCOUNTANT" | "DISPATCHER" | "RIDER";
    phone?: string | undefined;
}>;
export declare const createPackageSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    weight: z.ZodOptional<z.ZodNumber>;
    declaredValue: z.ZodOptional<z.ZodNumber>;
    deliveryFee: z.ZodOptional<z.ZodNumber>;
    specialInstructions: z.ZodOptional<z.ZodString>;
    senderId: z.ZodString;
    recipientId: z.ZodString;
    originAddress: z.ZodObject<{
        street: z.ZodString;
        city: z.ZodString;
        state: z.ZodOptional<z.ZodString>;
        country: z.ZodString;
        postalCode: z.ZodOptional<z.ZodString>;
        landmark: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        street: string;
        city: string;
        country: string;
        state?: string | undefined;
        postalCode?: string | undefined;
        landmark?: string | undefined;
    }, {
        street: string;
        city: string;
        country: string;
        state?: string | undefined;
        postalCode?: string | undefined;
        landmark?: string | undefined;
    }>;
    destinationAddress: z.ZodObject<{
        street: z.ZodString;
        city: z.ZodString;
        state: z.ZodOptional<z.ZodString>;
        country: z.ZodString;
        postalCode: z.ZodOptional<z.ZodString>;
        landmark: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        street: string;
        city: string;
        country: string;
        state?: string | undefined;
        postalCode?: string | undefined;
        landmark?: string | undefined;
    }, {
        street: string;
        city: string;
        country: string;
        state?: string | undefined;
        postalCode?: string | undefined;
        landmark?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    senderId: string;
    recipientId: string;
    originAddress: {
        street: string;
        city: string;
        country: string;
        state?: string | undefined;
        postalCode?: string | undefined;
        landmark?: string | undefined;
    };
    destinationAddress: {
        street: string;
        city: string;
        country: string;
        state?: string | undefined;
        postalCode?: string | undefined;
        landmark?: string | undefined;
    };
    description?: string | undefined;
    weight?: number | undefined;
    declaredValue?: number | undefined;
    deliveryFee?: number | undefined;
    specialInstructions?: string | undefined;
}, {
    senderId: string;
    recipientId: string;
    originAddress: {
        street: string;
        city: string;
        country: string;
        state?: string | undefined;
        postalCode?: string | undefined;
        landmark?: string | undefined;
    };
    destinationAddress: {
        street: string;
        city: string;
        country: string;
        state?: string | undefined;
        postalCode?: string | undefined;
        landmark?: string | undefined;
    };
    description?: string | undefined;
    weight?: number | undefined;
    declaredValue?: number | undefined;
    deliveryFee?: number | undefined;
    specialInstructions?: string | undefined;
}>;
export declare const createCustomerSchema: z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    phone: string;
    email?: string | undefined;
    address?: string | undefined;
}, {
    name: string;
    phone: string;
    email?: string | undefined;
    address?: string | undefined;
}>;
export declare const createRiderSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
    riderId: z.ZodOptional<z.ZodString>;
    vehicleType: z.ZodOptional<z.ZodString>;
    vehiclePlate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    riderId?: string | undefined;
    vehicleType?: string | undefined;
    vehiclePlate?: string | undefined;
}, {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    riderId?: string | undefined;
    vehicleType?: string | undefined;
    vehiclePlate?: string | undefined;
}>;
//# sourceMappingURL=validators.d.ts.map