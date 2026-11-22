import type { AuditAction } from '../enums';
export interface AuditLog {
    id: string;
    userId: string;
    action: AuditAction;
    entity: string;
    entityId: string;
    previousValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}
//# sourceMappingURL=audit.model.d.ts.map