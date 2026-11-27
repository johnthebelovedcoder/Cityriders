import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'DELIVERED'],
  IN_TRANSIT: ['DELIVERY_ATTEMPTED', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERY_ATTEMPTED', 'DELIVERED'],
  DELIVERY_ATTEMPTED: ['IN_TRANSIT', 'RETURNED', 'DELIVERED'],
};

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyDeliveries(userId: string) {
    const rider = await this.prisma.rider.findUnique({ where: { userId } });
    if (!rider) return [];
    return this.prisma.assignment.findMany({
      where: { riderId: rider.id, isActive: true },
      include: { package: { include: { sender: true, recipient: true } } },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async updateStatus(packageId: string, status: string, note: string | undefined, failedReason: string | undefined, performedById: string, reattemptAt?: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException('Package not found');

    const rider = await this.prisma.rider.findUnique({ where: { userId: performedById } });
    if (!rider) throw new BadRequestException('Rider profile not found');
    const assignment = await this.prisma.assignment.findFirst({
      where: { packageId, riderId: rider.id, isActive: true },
      select: { id: true },
    });
    if (!assignment) throw new BadRequestException('You can only update packages currently assigned to you');

    if (status === 'DELIVERY_ATTEMPTED') {
      if (!failedReason) throw new BadRequestException('A failure reason is required for an unsuccessful delivery');
      if (!['RECIPIENT_NOT_AVAILABLE', 'WRONG_ADDRESS', 'REFUSED_DELIVERY', 'ACCESS_ISSUE', 'OTHER'].includes(failedReason)) {
        throw new BadRequestException('Select a valid failure reason');
      }
      if (failedReason === 'OTHER' && !note?.trim()) {
        throw new BadRequestException('Add a note when selecting Other as the failure reason');
      }
      if (reattemptAt) {
        const plannedDate = new Date(reattemptAt);
        if (Number.isNaN(plannedDate.getTime()) || plannedDate <= new Date()) throw new BadRequestException('Reattempt date must be in the future');
      }
    } else if (reattemptAt) {
      throw new BadRequestException('A reattempt date can only be set for an unsuccessful delivery');
    }

    const allowed = ALLOWED_TRANSITIONS[pkg.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${pkg.status} to ${status}`);
    }
    if (status === 'DELIVERED' && !(await this.prisma.proofOfDelivery.findUnique({ where: { packageId }, select: { id: true } }))) {
      throw new BadRequestException('Submit a delivery photo or recipient signature before marking this package delivered');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.package.update({ where: { id: packageId }, data: { status: status as any, ...(reattemptAt ? { reattemptAt: new Date(reattemptAt) } : {}) } });
      await tx.packageStatusEvent.create({
        data: { packageId, status: status as any, note, failedReason: failedReason as any, reattemptAt: reattemptAt ? new Date(reattemptAt) : undefined, performedById, isCustomerVisible: true },
      });
      if (status === 'DELIVERY_ATTEMPTED' || status === 'DELIVERED') {
        await tx.deliveryAttempt.create({
          data: {
            packageId,
            riderId: rider.id,
            outcome: status as any,
            reason: status === 'DELIVERY_ATTEMPTED' ? (failedReason as any) : undefined,
            note,
          },
        });
      }
    });
  }

  async submitProof(packageId: string, proof: { recipientName?: string; otpCode?: string; notes?: string }, files: { photo?: Express.Multer.File[]; signature?: Express.Multer.File[] }, submittedById: string) {
    const photo = files.photo?.[0];
    const signature = files.signature?.[0];
    if (!photo && !signature) throw new BadRequestException('A delivery photo or recipient signature is required');
    const photoMime = photo && this.detectImageMimeType(photo.buffer);
    const signatureMime = signature && this.detectImageMimeType(signature.buffer);
    if (photo && !photoMime) throw new BadRequestException('Delivery photo must be a valid JPEG, PNG, or WebP image');
    if (signature && !signatureMime) throw new BadRequestException('Signature must be a valid JPEG, PNG, or WebP image');
    const pkg = await this.prisma.package.findUnique({ where: { id: packageId }, select: { id: true, status: true } });
    if (!pkg) throw new NotFoundException('Package not found');
    if (!['IN_TRANSIT', 'DELIVERY_ATTEMPTED', 'OUT_FOR_DELIVERY'].includes(pkg.status)) throw new BadRequestException('Proof can only be submitted for a package out for delivery');
    const rider = await this.prisma.rider.findUnique({ where: { userId: submittedById } });
    if (!rider) throw new BadRequestException('Rider profile not found');
    const assignment = await this.prisma.assignment.findFirst({
      where: { packageId, riderId: rider.id, isActive: true },
      select: { id: true },
    });
    if (!assignment) throw new BadRequestException('You can only submit proof for packages currently assigned to you');
    return this.prisma.proofOfDelivery.upsert({
      where: { packageId },
      create: { packageId, type: signature ? 'SIGNATURE' : 'PHOTO', recipientName: proof.recipientName, otpCode: proof.otpCode, notes: proof.notes, photoUrl: photo && `data:${photoMime};base64,${photo.buffer.toString('base64')}`, signatureUrl: signature && `data:${signatureMime};base64,${signature.buffer.toString('base64')}`, submittedById },
      update: { type: signature ? 'SIGNATURE' : 'PHOTO', recipientName: proof.recipientName, otpCode: proof.otpCode, notes: proof.notes, ...(photo ? { photoUrl: `data:${photoMime};base64,${photo.buffer.toString('base64')}` } : {}), ...(signature ? { signatureUrl: `data:${signatureMime};base64,${signature.buffer.toString('base64')}` } : {}), submittedById, submittedAt: new Date() },
    });
  }

  private detectImageMimeType(data: Buffer): string | null {
    if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
    if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
    if (data.length >= 12 && data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
    return null;
  }
}
