export interface Assignment {
    id: string;
    packageId: string;
    riderId: string;
    assignedById: string;
    reassignmentReason?: string;
    previousAssignmentId?: string;
    isActive: boolean;
    assignedAt: Date;
    unassignedAt?: Date;
}
export interface AssignmentWithRelations extends Assignment {
    rider: import('./rider.model').RiderWithUser;
    package: import('./package.model').Package;
    assignedBy: import('./user.model').User;
}
//# sourceMappingURL=assignment.model.d.ts.map