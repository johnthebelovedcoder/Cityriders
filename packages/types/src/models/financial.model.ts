import type { ExpenseCategory, PaymentMethod, PaymentStatus } from '../enums';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  notes?: string;
  packageId?: string;
  customerId?: string;
  recordedById: string;
  paymentDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  payee?: string;
  attachmentUrl?: string;
  packageId?: string;
  riderId?: string;
  recordedById: string;
  expenseDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentCorrection {
  id: string;
  paymentId: string;
  correctedById: string;
  previousAmount: number;
  newAmount: number;
  reason: string;
  createdAt: Date;
}
