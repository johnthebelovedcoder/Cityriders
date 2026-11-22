import {
  PrismaClient, UserRole, UserStatus, RiderStatus,
  PackageStatus, PaymentMethod, PaymentStatus,
  ExpenseCategory, PayrollStatus, AuditAction,
  InteractionChannel, EscalationPriority, EscalationStatus,
} from '../src/generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysAgo(n: number) { return new Date(Date.now() - 86400000 * n); }
function hoursAgo(n: number) { return new Date(Date.now() - 3600000 * n); }

async function main() {
  console.log('Seeding CityRider demo data...');

  // -- Passwords --------------------------------------------------------------
  const pw = await bcrypt.hash('Admin1234!', 12);

  // -- Users ------------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cityrider.com' },
    update: {},
    create: { firstName: 'Admin', lastName: 'User', email: 'admin@cityrider.com', password: pw, role: UserRole.ADMINISTRATOR, status: UserStatus.ACTIVE, phone: '+2348000000001' },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@cityrider.com' },
    update: {},
    create: { firstName: 'Chukwudi', lastName: 'Okoye', email: 'manager@cityrider.com', password: pw, role: UserRole.MANAGER, status: UserStatus.ACTIVE, phone: '+2348000000002' },
  });

  const dispatcher = await prisma.user.upsert({
    where: { email: 'dispatcher@cityrider.com' },
    update: {},
    create: { firstName: 'Dispatch', lastName: 'Mgr', email: 'dispatcher@cityrider.com', password: pw, role: UserRole.DISPATCHER, status: UserStatus.ACTIVE, phone: '+2348000000003' },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@cityrider.com' },
    update: {},
    create: { firstName: 'Ngozi', lastName: 'Eze', email: 'accountant@cityrider.com', password: pw, role: UserRole.ACCOUNTANT, status: UserStatus.ACTIVE, phone: '+2348000000004' },
  });

  const riderUsers = await Promise.all([
    { first: 'Emeka', last: 'Obi', email: 'rider1@cityrider.com', phone: '+2348031111111' },
    { first: 'Fatima', last: 'Musa', email: 'rider2@cityrider.com', phone: '+2348032222222' },
    { first: 'Chidi', last: 'Nwosu', email: 'rider3@cityrider.com', phone: '+2348033333333' },
    { first: 'Amaka', last: 'Eze', email: 'rider4@cityrider.com', phone: '+2348034444444' },
    { first: 'Tunde', last: 'Adeyemi', email: 'rider5@cityrider.com', phone: '+2348035555555' },
  ].map(r => prisma.user.upsert({
    where: { email: r.email },
    update: {},
    create: { firstName: r.first, lastName: r.last, email: r.email, password: pw, role: UserRole.RIDER, status: UserStatus.ACTIVE, phone: r.phone },
  })));

  // -- Riders ------------------------------------------------------------------
  const riderData = [
    { riderId: 'RDR-001', vehicleType: 'Motorcycle', vehiclePlate: 'LG-123-ABC' },
    { riderId: 'RDR-002', vehicleType: 'Bicycle', vehiclePlate: null },
    { riderId: 'RDR-003', vehicleType: 'Motorcycle', vehiclePlate: 'LG-456-XYZ' },
    { riderId: 'RDR-004', vehicleType: 'Van', vehiclePlate: 'LG-789-DEF' },
    { riderId: 'RDR-005', vehicleType: 'Motorcycle', vehiclePlate: 'LG-321-GHI', status: RiderStatus.INACTIVE },
  ];

  const riders = await Promise.all(riderUsers.map((u, i) => prisma.rider.upsert({
    where: { userId: u.id },
    update: {},
    create: {
      userId: u.id,
      riderId: riderData[i].riderId,
      vehicleType: riderData[i].vehicleType,
      vehiclePlate: riderData[i].vehiclePlate,
      status: (riderData[i] as any).status ?? RiderStatus.ACTIVE,
    },
  })));

  // -- Settings + Zones -------------------------------------------------------
  const settings = await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'CityRider Logistics',
      address: '12 Marina Street, Lagos Island',
      phone: '+234 801 234 5678',
      email: 'ops@cityrider.com',
    },
  });
  const zoneNames = ['Lagos Island', 'Victoria Island', 'Lekki', 'Yaba', 'Ikeja', 'Surulere'];
  const zonePrices = [1500, 2000, 2500, 2000, 2500, 1800];
  const zones: any[] = [];
  for (let i = 0; i < zoneNames.length; i++) {
    const existing = await prisma.zone.findFirst({ where: { name: zoneNames[i], settingsId: 'default' } });
    if (!existing) {
      zones.push(await prisma.zone.create({ data: { name: zoneNames[i], basePrice: zonePrices[i], settingsId: 'default' } }));
    } else {
      zones.push(existing);
    }
  }

  // -- Customers --------------------------------------------------------------
  const customerData = [
    { name: 'Alice Corp', phone: '+2348001111111', email: 'alice@alicecorp.com', address: '12 Marina St, Lagos Island' },
    { name: 'XYZ Limited', phone: '+2348002222222', email: 'procurement@xyz.ng', address: '5 Ozumba Mbadiwe, VI' },
    { name: 'City Mart', phone: '+2348003333333', email: null, address: '78 Allen Ave, Ikeja' },
    { name: 'Tech Solutions NG', phone: '+2348004444444', email: 'orders@techsolutions.ng', address: '33 Admiralty Way, Lekki' },
    { name: 'Bello Enterprises', phone: '+2348005555555', email: 'bello@enterprise.com', address: '19 Adeola Odeku, VI' },
    { name: 'Mama Comfort Foods', phone: '+2348006666666', email: null, address: '45 Western Ave, Surulere' },
    { name: 'Femi Okafor', phone: '+2348007777777', email: 'femi@gmail.com', address: '7 Lekki-Epe Expressway, Lekki' },
    { name: 'Zainab Traders', phone: '+2348008888888', email: null, address: '102 Obafemi Awolowo Way, Ikeja' },
  ];

  const customers: any[] = [];
  for (const c of customerData) {
    const existing = await prisma.customer.findFirst({ where: { phone: c.phone } });
    if (!existing) {
      customers.push(await prisma.customer.create({ data: c }));
    } else {
      customers.push(existing);
    }
  }

  // -- Recipients -------------------------------------------------------------
  const recipientData = [
    { name: 'Bob Smith', phone: '+2349011111111', deliveryAddress: '24 Broad St, Lagos Island' },
    { name: 'Jane Doe', phone: '+2349022222222', deliveryAddress: '8 Wuse Zone 5, Abuja' },
    { name: 'Ngozi Obi', phone: '+2349033333333', deliveryAddress: '15 Rumuola Rd, Port Harcourt' },
    { name: 'Aisha Bello', phone: '+2349044444444', deliveryAddress: '3 Adetokunbo Ademola, VI' },
    { name: 'Tunde Adex', phone: '+2349055555555', deliveryAddress: '22 Ikosi Rd, Ikeja' },
    { name: 'Kemi Ade', phone: '+2349066666666', deliveryAddress: '11 Fola Osibo, Lekki' },
    { name: 'Chukwuemeka Nnaji', phone: '+2349077777777', deliveryAddress: '5 Oduduwa Way, GRA Ikeja' },
    { name: 'Halima Sule', phone: '+2349088888888', deliveryAddress: '28 Nnamdi Azikiwe, Lagos Island' },
    { name: 'Victor Eze', phone: '+2349099999999', deliveryAddress: '14 Murtala Mohammed, Yaba' },
    { name: 'Grace Okonkwo', phone: '+2349010101010', deliveryAddress: '37 Surulere Rd, Surulere' },
    { name: 'Ibrahim Danjuma', phone: '+2349011111112', deliveryAddress: '9 Ojuelegba Rd, Surulere' },
    { name: 'Chioma Nwachukwu', phone: '+2349022222223', deliveryAddress: '45 Lekki Phase 1, Lekki' },
  ];

  const recipients: any[] = [];
  for (const r of recipientData) {
    const existing = await prisma.recipient.findFirst({ where: { phone: r.phone } });
    if (!existing) {
      recipients.push(await prisma.recipient.create({ data: r }));
    } else {
      recipients.push(existing);
    }
  }

  // -- Packages ---------------------------------------------------------------
  const pkgDefs = [
    { tracking: 'CRD-NG0000001', status: PackageStatus.DELIVERED, sendI: 0, recI: 0, desc: 'Electronics - Laptop', weight: 2.5, fee: 3500, originStreet: '12 Marina St', originCity: 'Lagos Island', daysBack: 10 },
    { tracking: 'CRD-NG0000002', status: PackageStatus.IN_TRANSIT, sendI: 1, recI: 1, desc: 'Legal Documents', weight: 0.5, fee: 2000, originStreet: '5 Ozumba Mbadiwe', originCity: 'Victoria Island', daysBack: 2 },
    { tracking: 'CRD-NG0000003', status: PackageStatus.ASSIGNED, sendI: 2, recI: 2, desc: 'Fresh Food Items', weight: 5.0, fee: 2500, originStreet: '78 Allen Ave', originCity: 'Ikeja', daysBack: 1 },
    { tracking: 'CRD-NG0000004', status: PackageStatus.AWAITING_ASSIGNMENT, sendI: 3, recI: 3, desc: 'Clothing - 3 Outfits', weight: 1.2, fee: 2000, originStreet: '33 Admiralty Way', originCity: 'Lekki', daysBack: 0 },
    { tracking: 'CRD-NG0000005', status: PackageStatus.DELIVERED, sendI: 4, recI: 4, desc: 'Phone Accessories', weight: 0.8, fee: 1800, originStreet: '19 Adeola Odeku', originCity: 'Victoria Island', daysBack: 7 },
    { tracking: 'CRD-NG0000006', status: PackageStatus.PICKED_UP, sendI: 0, recI: 5, desc: 'Industrial Parts', weight: 8.5, fee: 5000, originStreet: '12 Marina St', originCity: 'Lagos Island', daysBack: 1 },
    { tracking: 'CRD-NG0000007', status: PackageStatus.DELIVERY_ATTEMPTED, sendI: 5, recI: 6, desc: 'Groceries', weight: 3.2, fee: 2200, originStreet: '45 Western Ave', originCity: 'Surulere', daysBack: 3 },
    { tracking: 'CRD-NG0000008', status: PackageStatus.AWAITING_ASSIGNMENT, sendI: 6, recI: 7, desc: 'Books and Stationery', weight: 2.0, fee: 1500, originStreet: '7 Lekki-Epe Expressway', originCity: 'Lekki', daysBack: 0 },
    { tracking: 'CRD-NG0000009', status: PackageStatus.DELIVERED, sendI: 1, recI: 8, desc: 'Office Equipment', weight: 15.0, fee: 8000, originStreet: '5 Ozumba Mbadiwe', originCity: 'Victoria Island', daysBack: 14 },
    { tracking: 'CRD-NG0000010', status: PackageStatus.RETURNED, sendI: 2, recI: 9, desc: 'Defective Item - Return', weight: 1.5, fee: 1500, originStreet: '78 Allen Ave', originCity: 'Ikeja', daysBack: 5 },
    { tracking: 'CRD-NG0000011', status: PackageStatus.IN_TRANSIT, sendI: 3, recI: 10, desc: 'Medical Supplies', weight: 0.3, fee: 2500, originStreet: '33 Admiralty Way', originCity: 'Lekki', daysBack: 1 },
    { tracking: 'CRD-NG0000012', status: PackageStatus.AWAITING_ASSIGNMENT, sendI: 7, recI: 11, desc: 'Fabrics and Textiles', weight: 4.0, fee: 2000, originStreet: '102 Obafemi Awolowo Way', originCity: 'Ikeja', daysBack: 0 },
    { tracking: 'CRD-NG0000013', status: PackageStatus.DELIVERED, sendI: 4, recI: 0, desc: 'Shoes and Bags', weight: 2.1, fee: 2500, originStreet: '19 Adeola Odeku', originCity: 'Victoria Island', daysBack: 20 },
    { tracking: 'CRD-NG0000014', status: PackageStatus.CANCELLED, sendI: 5, recI: 1, desc: 'Cancelled Order', weight: 1.0, fee: 0, originStreet: '45 Western Ave', originCity: 'Surulere', daysBack: 8 },
    { tracking: 'CRD-NG0000015', status: PackageStatus.DISPATCHED, sendI: 0, recI: 2, desc: 'Computer Peripherals', weight: 3.5, fee: 3000, originStreet: '12 Marina St', originCity: 'Lagos Island', daysBack: 1 },
  ];

  const packages: any[] = [];
  for (const p of pkgDefs) {
    const existing = await prisma.package.findUnique({ where: { trackingNumber: p.tracking } });
    if (!existing) {
      const pkg = await prisma.package.create({
        data: {
          trackingNumber: p.tracking,
          status: p.status,
          description: p.desc,
          weight: p.weight,
          deliveryFee: p.fee,
          originStreet: p.originStreet,
          originCity: p.originCity,
          originCountry: 'Nigeria',
          destStreet: recipients[p.recI].deliveryAddress.split(',')[0],
          destCity: recipients[p.recI].deliveryAddress.split(',')[1]?.trim() ?? 'Lagos',
          destCountry: 'Nigeria',
          senderId: customers[p.sendI].id,
          recipientId: recipients[p.recI].id,
          createdById: admin.id,
          createdAt: daysAgo(p.daysBack),
        },
      });
      packages.push(pkg);
    } else {
      packages.push(existing);
    }
  }

  // -- Assignments ------------------------------------------------------------
  const assignDefs = [
    { pkgI: 0, riderI: 0, daysBack: 9 },
    { pkgI: 1, riderI: 1, daysBack: 1 },
    { pkgI: 2, riderI: 2, daysBack: 1 },
    { pkgI: 4, riderI: 0, daysBack: 6 },
    { pkgI: 5, riderI: 1, daysBack: 1 },
    { pkgI: 6, riderI: 2, daysBack: 2 },
    { pkgI: 8, riderI: 3, daysBack: 13 },
    { pkgI: 10, riderI: 0, daysBack: 1 },
    { pkgI: 12, riderI: 1, daysBack: 19 },
    { pkgI: 14, riderI: 2, daysBack: 1 },
  ];
  for (const a of assignDefs) {
    const existing = await prisma.assignment.findFirst({ where: { packageId: packages[a.pkgI].id } });
    if (!existing) {
      await prisma.assignment.create({
        data: {
          packageId: packages[a.pkgI].id,
          riderId: riders[a.riderI].id,
          assignedById: dispatcher.id,
          isActive: [PackageStatus.ASSIGNED, PackageStatus.IN_TRANSIT, PackageStatus.PICKED_UP, PackageStatus.DISPATCHED].includes(packages[a.pkgI].status),
          assignedAt: daysAgo(a.daysBack),
        },
      });
    }
  }

  // -- Payments ---------------------------------------------------------------
  const payDefs = [
    { pkgI: 0, custI: 0, amount: 3500, method: PaymentMethod.BANK_TRANSFER, daysBack: 9 },
    { pkgI: 4, custI: 4, amount: 1800, method: PaymentMethod.CASH, daysBack: 6 },
    { pkgI: 8, custI: 1, amount: 8000, method: PaymentMethod.BANK_TRANSFER, daysBack: 13 },
    { pkgI: 12, custI: 4, amount: 2500, method: PaymentMethod.CASH, daysBack: 19 },
    { pkgI: 1, custI: 1, amount: 2000, method: PaymentMethod.POS, daysBack: 1 },
    { pkgI: 2, custI: 2, amount: 2500, method: PaymentMethod.CASH, daysBack: 1 },
    { pkgI: 5, custI: 0, amount: 5000, method: PaymentMethod.BANK_TRANSFER, daysBack: 1 },
    { pkgI: 10, custI: 3, amount: 2500, method: PaymentMethod.POS, daysBack: 1 },
  ];
  for (const pd of payDefs) {
    const existing = await prisma.payment.findFirst({ where: { packageId: packages[pd.pkgI].id } });
    if (!existing) {
      await prisma.payment.create({
        data: {
          amount: pd.amount,
          currency: 'NGN',
          method: pd.method,
          status: PaymentStatus.COMPLETED,
          packageId: packages[pd.pkgI].id,
          customerId: customers[pd.custI].id,
          recordedById: accountant.id,
          paymentDate: daysAgo(pd.daysBack),
        },
      });
    }
  }

  // -- Expenses ---------------------------------------------------------------
  const expDefs = [
    { amount: 15000, category: ExpenseCategory.FUEL, desc: 'Fuel for dispatch bikes - weekly top-up', payee: 'Total Energies', daysBack: 2 },
    { amount: 25000, category: ExpenseCategory.MAINTENANCE, desc: 'Motorcycle servicing - 3 bikes', payee: 'City Mechanics', daysBack: 5 },
    { amount: 5000, category: ExpenseCategory.OFFICE, desc: 'Stationery, printing and supplies', payee: 'Shoprite', daysBack: 7 },
    { amount: 80000, category: ExpenseCategory.RIDER_COMPENSATION, desc: 'Rider monthly salary advance - Emeka', payee: 'Emeka Obi', daysBack: 3, riderI: 0 },
    { amount: 12000, category: ExpenseCategory.MARKETING, desc: 'Facebook and Instagram ads campaign', payee: 'Meta Ads', daysBack: 10 },
    { amount: 8500, category: ExpenseCategory.FUEL, desc: 'Fuel - mid-week refill', payee: 'Oando Fuel Station', daysBack: 4 },
    { amount: 35000, category: ExpenseCategory.MAINTENANCE, desc: 'Van tyre replacement - LG-789-DEF', payee: 'Lagos Tyres Ltd', daysBack: 8 },
    { amount: 3000, category: ExpenseCategory.OFFICE, desc: 'Office refreshments and water', payee: 'Mart365', daysBack: 1 },
    { amount: 45000, category: ExpenseCategory.RIDER_COMPENSATION, desc: 'Rider monthly salary - Fatima', payee: 'Fatima Musa', daysBack: 3, riderI: 1 },
    { amount: 6000, category: ExpenseCategory.OTHER, desc: 'Miscellaneous - courier bags and labels', payee: 'Jumia', daysBack: 12 },
  ];
  for (const e of expDefs) {
    const existing = await prisma.expense.findFirst({ where: { description: e.desc } });
    if (!existing) {
      await prisma.expense.create({
        data: {
          amount: e.amount,
          currency: 'NGN',
          category: e.category,
          description: e.desc,
          payee: e.payee,
          recordedById: accountant.id,
          riderId: (e as any).riderI !== undefined ? riders[(e as any).riderI].id : undefined,
          expenseDate: daysAgo(e.daysBack),
        },
      });
    }
  }

  // -- Payroll ----------------------------------------------------------------
  const period = '2026-11';
  const payrollDefs = [
    { riderI: 0, deliveries: 32, rate: 5000, bonus: 2000, status: PayrollStatus.PAID },
    { riderI: 1, deliveries: 27, rate: 5000, bonus: 0, status: PayrollStatus.PENDING },
    { riderI: 2, deliveries: 15, rate: 5000, bonus: 1000, status: PayrollStatus.PENDING },
    { riderI: 3, deliveries: 11, rate: 5000, bonus: 0, status: PayrollStatus.DRAFT },
    { riderI: 4, deliveries: 0, rate: 5000, bonus: 0, status: PayrollStatus.DRAFT },
  ];
  for (const pr of payrollDefs) {
    const existing = await prisma.payrollRecord.findFirst({ where: { riderId: riders[pr.riderI].id, period } });
    if (!existing) {
      await prisma.payrollRecord.create({
        data: {
          riderId: riders[pr.riderI].id,
          period,
          deliveries: pr.deliveries,
          ratePerDelivery: pr.rate,
          bonus: pr.bonus,
          total: pr.deliveries * pr.rate + pr.bonus,
          status: pr.status,
          paidAt: pr.status === PayrollStatus.PAID ? daysAgo(3) : undefined,
          paidById: pr.status === PayrollStatus.PAID ? manager.id : undefined,
        },
      });
    }
  }

  // -- Audit logs -------------------------------------------------------------
  const auditDefs = [
    { action: AuditAction.LOGIN, entity: 'User', entityId: admin.id, userId: admin.id, daysBack: 0 },
    { action: AuditAction.CREATE, entity: 'Package', entityId: packages[0].id, userId: admin.id, daysBack: 10 },
    { action: AuditAction.ASSIGN, entity: 'Assignment', entityId: packages[0].id, userId: dispatcher.id, daysBack: 9 },
    { action: AuditAction.STATUS_CHANGE, entity: 'Package', entityId: packages[0].id, userId: admin.id, daysBack: 8 },
    { action: AuditAction.CREATE, entity: 'Package', entityId: packages[1].id, userId: dispatcher.id, daysBack: 2 },
    { action: AuditAction.UPDATE, entity: 'Rider', entityId: riders[0].id, userId: admin.id, daysBack: 5 },
    { action: AuditAction.LOGIN, entity: 'User', entityId: manager.id, userId: manager.id, daysBack: 1 },
  ];
  for (const a of auditDefs) {
    await prisma.auditLog.create({
      data: {
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        userId: a.userId,
        createdAt: daysAgo(a.daysBack),
      },
    });
  }

  console.log('Seed completed. Demo login: admin@cityrider.com / Admin1234!');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());