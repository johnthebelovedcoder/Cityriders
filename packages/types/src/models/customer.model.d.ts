export interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Recipient {
    id: string;
    name: string;
    phone: string;
    email?: string;
    deliveryAddress: string;
    deliveryNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=customer.model.d.ts.map