import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');
export const phoneSchema = z
  .string()
  .min(7, 'Phone number too short')
  .max(20, 'Phone number too long')
  .regex(/^\+?[\d\s\-().]+$/, 'Invalid phone number');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  postalCode: z.string().optional(),
  landmark: z.string().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
  role: z.enum(['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'DISPATCHER', 'RIDER']),
});

export const createPackageSchema = z.object({
  description: z.string().max(500).optional(),
  weight: z.number().positive().optional(),
  declaredValue: z.number().nonnegative().optional(),
  deliveryFee: z.number().nonnegative().optional(),
  specialInstructions: z.string().max(1000).optional(),
  senderId: z.string().cuid('Invalid sender ID'),
  recipientId: z.string().cuid('Invalid recipient ID'),
  originAddress: addressSchema,
  destinationAddress: addressSchema,
});

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: phoneSchema,
  email: emailSchema.optional(),
  address: z.string().max(500).optional(),
});

export const createRiderSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  riderId: z.string().optional(),
  vehicleType: z.string().optional(),
  vehiclePlate: z.string().optional(),
});
