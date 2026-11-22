import type { ProofOfDeliveryType } from '../enums';
export interface ProofOfDelivery {
    id: string;
    packageId: string;
    type: ProofOfDeliveryType;
    recipientName?: string;
    otpCode?: string;
    photoUrl?: string;
    signatureUrl?: string;
    notes?: string;
    submittedById: string;
    submittedAt: Date;
}
//# sourceMappingURL=delivery.model.d.ts.map