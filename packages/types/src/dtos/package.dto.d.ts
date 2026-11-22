import type { Address, PackageDimensions } from '../models/package.model';
export interface CreatePackageDto {
    description?: string;
    weight?: number;
    dimensions?: PackageDimensions;
    declaredValue?: number;
    deliveryFee?: number;
    specialInstructions?: string;
    senderId: string;
    recipientId: string;
    originAddress: Address;
    destinationAddress: Address;
}
export interface UpdatePackageDto extends Partial<CreatePackageDto> {
    internalNotes?: string;
}
export interface PackageQueryDto {
    search?: string;
    status?: string;
    riderId?: string;
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface UpdatePackageStatusDto {
    status: string;
    note?: string;
    failedReason?: string;
    isCustomerVisible?: boolean;
}
//# sourceMappingURL=package.dto.d.ts.map