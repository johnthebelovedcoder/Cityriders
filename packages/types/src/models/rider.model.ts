import type { RiderStatus } from '../enums';

export interface Rider {
  id: string;
  userId: string;
  riderId?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  status: RiderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RiderWithUser extends Rider {
  user: import('./user.model').User;
  activeAssignmentsCount?: number;
  completedDeliveriesCount?: number;
}
