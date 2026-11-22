import type { PackageStatus } from '../enums';

export interface Package {
  id: string;
  trackingNumber: string;
  description?: string;
  weight?: number;
  dimensions?: PackageDimensions;
  declaredValue?: number;
  deliveryFee?: number;
  specialInstructions?: string;
  internalNotes?: string;
  status: PackageStatus;
  senderId: string;
  recipientId: string;
  originAddress: Address;
  destinationAddress: Address;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PackageDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  landmark?: string;
}

export interface PackageStatusEvent {
  id: string;
  packageId: string;
  status: PackageStatus;
  note?: string;
  failedReason?: string;
  isCustomerVisible: boolean;
  performedById: string;
  createdAt: Date;
}

export interface PackageWithRelations extends Package {
  sender: import('./customer.model').Customer;
  recipient: import('./customer.model').Recipient;
  currentAssignment?: import('./assignment.model').Assignment;
  statusHistory: PackageStatusEvent[];
  proofOfDelivery?: import('./delivery.model').ProofOfDelivery;
}
