import axios from 'axios';
import { toast } from 'sonner';


// --- Mock data (used when API / DB is unavailable) ---------------------------

const MOCK_DB: Record<string, any> = {
  'get /dashboard/stats': {
    totalPackages: 24,
    activeDeliveries: 8,
    completedToday: 5,
    activeRiders: 4,
    pendingAssignments: 3,
    revenueToday: 42500,
    revenueMtd: 272000,
    failedToday: 2,
    pendingExpenseApprovals: 3,
    totalCustomers: 48,
    newPackagesToday: 7,
    avgDeliveryHours: 3.4,
    successRate: 87,
    overdueInvoices: 1,
    weekOverWeek: { activeDeliveries: 12, revenueToday: -8, completedToday: 24 },
    topRiders: [
      { name: 'Emeka Obi', deliveriesToday: 4, status: 'On delivery', vehicle: 'Motorcycle' },
      { name: 'Fatima Musa', deliveriesToday: 3, status: 'On delivery', vehicle: 'Bicycle' },
      { name: 'Chidi Nwosu', deliveriesToday: 2, status: 'Available', vehicle: 'Motorcycle' },
      { name: 'Amina Yusuf', deliveriesToday: 0, status: 'Off duty', vehicle: 'Motorcycle' },
    ],
    deliveryTrend: [
      { day: 'Mon', delivered: 7, failed: 1 },
      { day: 'Tue', delivered: 9, failed: 0 },
      { day: 'Wed', delivered: 6, failed: 2 },
      { day: 'Thu', delivered: 11, failed: 1 },
      { day: 'Fri', delivered: 8, failed: 0 },
      { day: 'Sat', delivered: 5, failed: 1 },
      { day: 'Sun', delivered: 3, failed: 0 },
    ],
    statusBreakdown: [
      { name: 'In Transit', value: 8, color: '#f59e0b' },
      { name: 'Assigned', value: 5, color: '#3b82f6' },
      { name: 'Awaiting', value: 3, color: '#eab308' },
      { name: 'Delivered', value: 5, color: '#22c55e' },
      { name: 'Other', value: 3, color: '#94a3b8' },
    ],
    recentActivity: [
      { id: 'ev1', type: 'DELIVERED', message: 'CRD-MK0000003 delivered to Test User', time: new Date(Date.now() - 1000 * 60 * 12).toISOString(), packageId: 'p3' },
      { id: 'ev2', type: 'ASSIGNED', message: 'CRD-MK0000002 assigned to Fatima Musa', time: new Date(Date.now() - 1000 * 60 * 35).toISOString(), packageId: 'p2' },
      { id: 'ev3', type: 'IN_TRANSIT', message: 'CRD-MK0000001 picked up by Emeka Obi', time: new Date(Date.now() - 1000 * 60 * 58).toISOString(), packageId: 'p1' },
      { id: 'ev4', type: 'REGISTERED', message: 'New package CRD-MK0000004 registered', time: new Date(Date.now() - 1000 * 60 * 90).toISOString(), packageId: 'p1' },
      { id: 'ev5', type: 'DELIVERY_ATTEMPTED', message: 'CRD-MK0000005 delivery attempted - recipient unavailable', time: new Date(Date.now() - 1000 * 60 * 140).toISOString(), packageId: 'p2' },
    ],
    recentPackages: [
      { id: 'p1', trackingNumber: 'CRD-MK0000001', status: 'IN_TRANSIT', sender: { name: 'Alice Corp' }, recipient: { name: 'Bob Smith' }, destCity: 'Lagos', createdAt: new Date().toISOString() },
      { id: 'p2', trackingNumber: 'CRD-MK0000002', status: 'ASSIGNED', sender: { name: 'XYZ Ltd' }, recipient: { name: 'Jane Doe' }, destCity: 'Abuja', createdAt: new Date().toISOString() },
      { id: 'p3', trackingNumber: 'CRD-MK0000003', status: 'DELIVERED', sender: { name: 'Demo Sender' }, recipient: { name: 'Test User' }, destCity: 'Port Harcourt', createdAt: new Date().toISOString() },
    ],
  },
  'get /payroll': {
    period: '2026-11',
    summary: { totalPayroll: 480000, paidOut: 320000, pending: 160000, riderCount: 2 },
    records: [
      { id: 'pr1', riderId: 'r1', riderName: 'Emeka Obi', deliveries: 32, ratePerDelivery: 5000, bonus: 2000, total: 162000, status: 'PAID', paidAt: new Date(Date.now() - 86400000 * 3).toISOString() },
      { id: 'pr2', riderId: 'r2', riderName: 'Fatima Musa', deliveries: 27, ratePerDelivery: 5000, bonus: 0, total: 135000, status: 'PENDING', paidAt: null },
    ],
  },
  'get /packages/stats': { total: 3, delivered: 1, inTransit: 1, pending: 1 },
  'get /customers/stats': { total: 2, withPackages: 2, newThisMonth: 1 },
  'get /riders/stats': { total: 2, active: 2, onDelivery: 1 },
  'get /packages': {
    data: [
      { id: 'p1', trackingNumber: 'CRD-MK0000001', status: 'IN_TRANSIT', sender: { name: 'Alice Corp' }, recipient: { name: 'Bob Smith' }, destCity: 'Lagos', destStreet: '12 Marina St', weight: 2.5, createdAt: new Date().toISOString() },
      { id: 'p2', trackingNumber: 'CRD-MK0000002', status: 'ASSIGNED', sender: { name: 'XYZ Ltd' }, recipient: { name: 'Jane Doe' }, destCity: 'Abuja', destStreet: '5 Gwarinpa Ave', weight: 1.2, createdAt: new Date().toISOString() },
      { id: 'p3', trackingNumber: 'CRD-MK0000003', status: 'DELIVERED', sender: { name: 'Demo Sender' }, recipient: { name: 'Test User' }, destCity: 'Port Harcourt', destStreet: '7 Rumuola Rd', weight: 0.8, createdAt: new Date().toISOString() },
    ],
    meta: { total: 3, page: 1, limit: 25, totalPages: 1 },
  },
  'get /customers': [
    { id: 'c1', name: 'Alice Corp', phone: '+2348001234567', email: 'alice@demo.com', address: '12 Marina St, Lagos', clv: 45000, shipmentCount: 18 },
    { id: 'c2', name: 'XYZ Ltd', phone: '+2348007654321', email: 'xyz@demo.com', address: '5 Gwarinpa Ave, Abuja', clv: 35000, shipmentCount: 14 },
    { id: 'c3', name: 'Demo Sender', phone: '+2348005555555', email: 'demo@demo.com', address: '7 Rumuola Rd, Port Harcourt', clv: 22500, shipmentCount: 9 },
    { id: 'c4', name: 'Tech Solutions', phone: '+2348004444444', email: 'tech@demo.com', address: '1 Innovation Way, Lagos', clv: 17500, shipmentCount: 7 },
    { id: 'c5', name: 'City Mart', phone: '+2348003333333', email: 'city@demo.com', address: '20 Broad St, Lagos', clv: 12500, shipmentCount: 5 },
  ],
  'get /riders': [
    { id: 'r1', status: 'ACTIVE', vehicleType: 'Motorcycle', vehiclePlate: 'LG-123-XY', zoneId: 'z1', zone: { id: 'z1', name: 'Lagos Island', basePrice: 1500 }, user: { firstName: 'Emeka', lastName: 'Obi', phone: '+2348031111111' } },
    { id: 'r2', status: 'ACTIVE', vehicleType: 'Bicycle', vehiclePlate: null, zoneId: 'z2', zone: { id: 'z2', name: 'Victoria Island', basePrice: 1500 }, user: { firstName: 'Fatima', lastName: 'Musa', phone: '+2348032222222' } },
  ],
  'get /riders/active': [
    { id: 'r1', status: 'ACTIVE', vehicleType: 'Motorcycle', vehiclePlate: 'LG-123-XY', zoneId: 'z1', zone: { id: 'z1', name: 'Lagos Island', basePrice: 1500 }, user: { firstName: 'Emeka', lastName: 'Obi' } },
    { id: 'r2', status: 'ACTIVE', vehicleType: 'Bicycle', vehiclePlate: null, zoneId: 'z2', zone: { id: 'z2', name: 'Victoria Island', basePrice: 1500 }, user: { firstName: 'Fatima', lastName: 'Musa' } },
  ],
  'get /assignments': {
    data: [
      { id: 'a1', assignedAt: new Date().toISOString(), rider: { user: { firstName: 'Emeka', lastName: 'Obi' } }, package: { id: 'p1', trackingNumber: 'CRD-MK0000001', status: 'IN_TRANSIT', sender: { name: 'Alice Corp' }, recipient: { name: 'Bob Smith' } } },
    ],
    meta: { total: 1, page: 1, limit: 25, totalPages: 1 },
  },
  'get /deliveries/my': [],
  'get /users/me': { id: 'mock-001', firstName: 'Admin', lastName: 'User', email: 'admin@cityrider.com', role: 'DISPATCHER' },

  // -- Phase 2: Payments --------------------------------------------------------
  'get /payments': {
    data: [
      { id: 'pay1', type: 'DeliveryFee', amount: 2500, currency: 'NGN', status: 'Paid', method: 'Cash', reference: 'REF-001', paidAt: new Date().toISOString(), package: { trackingNumber: 'CRD-MK0000001' }, customer: { name: 'Alice Corp' }, createdAt: new Date().toISOString() },
      { id: 'pay2', type: 'Credit', amount: 10000, currency: 'NGN', status: 'Paid', method: 'BankTransfer', reference: 'REF-002', paidAt: new Date().toISOString(), customer: { name: 'XYZ Ltd' }, createdAt: new Date().toISOString() },
      { id: 'pay3', type: 'RiderRemittance', amount: 5000, currency: 'NGN', status: 'Paid', method: 'Cash', reference: 'REF-003', paidAt: new Date().toISOString(), rider: { user: { firstName: 'Emeka', lastName: 'Obi' } }, createdAt: new Date().toISOString() },
      { id: 'pay4', type: 'DeliveryFee', amount: 1800, currency: 'NGN', status: 'Pending', method: 'Card', reference: 'REF-004', paidAt: null, package: { trackingNumber: 'CRD-MK0000002' }, customer: { name: 'Demo Sender' }, createdAt: new Date().toISOString() },
      { id: 'pay5', type: 'Refund', amount: 1200, currency: 'NGN', status: 'Refunded', method: 'Cash', reference: 'REF-005', paidAt: new Date().toISOString(), customer: { name: 'Alice Corp' }, createdAt: new Date().toISOString() },
    ],
    meta: { total: 5, page: 1, limit: 25, totalPages: 1 },
    summary: { totalCollected: 14300, totalPending: 1800, totalRemitted: 5000 },
  },

  // -- Phase 2: Expenses --------------------------------------------------------
  'get /expenses': {
    data: [
      { id: 'exp1', category: 'Fuel', amount: 15000, currency: 'NGN', description: 'Fuel for dispatch bikes', date: new Date().toISOString(), paidTo: 'Total Station', status: 'Approved', createdAt: new Date().toISOString() },
      { id: 'exp2', category: 'Maintenance', amount: 25000, currency: 'NGN', description: 'Motorcycle servicing', date: new Date().toISOString(), paidTo: 'City Mechanics', status: 'PendingApproval', createdAt: new Date().toISOString() },
      { id: 'exp3', category: 'Office', amount: 5000, currency: 'NGN', description: 'Stationery and supplies', date: new Date().toISOString(), paidTo: 'Shoprite', status: 'Approved', createdAt: new Date().toISOString() },
      { id: 'exp4', category: 'Salary', amount: 80000, currency: 'NGN', description: 'Monthly staff salary', date: new Date().toISOString(), paidTo: 'Staff', status: 'Approved', createdAt: new Date().toISOString() },
      { id: 'exp5', category: 'Marketing', amount: 12000, currency: 'NGN', description: 'Social media ads', date: new Date().toISOString(), paidTo: 'Meta Ads', status: 'PendingApproval', createdAt: new Date().toISOString() },
    ],
    meta: { total: 5, page: 1, limit: 25, totalPages: 1 },
    summary: { thisMonth: 137000, lastMonth: 98500 },
  },

  // -- Phase 3: Settings --------------------------------------------------------
  'get /settings': {
    companyName: 'CityRider Logistics',
    address: '12 Marina Street, Lagos Island',
    phone: '+234 801 234 5678',
    email: 'ops@cityrider.com',
    currency: 'NGN',
    flatDeliveryFee: 1500,
    weightSurcharge: 200,
    expenseApprovalThreshold: 20000,
    lowCreditThreshold: 5000,
    smsEnabled: false,
    notificationRules: {
      recipient: {
        BOOKING_CONFIRMED:  { sms: true,  email: true,  inApp: false },
        RIDER_ASSIGNED:     { sms: false, email: false, inApp: true  },
        OUT_FOR_DELIVERY:   { sms: true,  email: false, inApp: true  },
        DELIVERY_ATTEMPTED: { sms: true,  email: true,  inApp: true  },
        DELIVERED:          { sms: true,  email: true,  inApp: false },
      },
      staff: {
        ASSIGNMENT_CREATED: { MANAGER: true,  DISPATCHER: true,  ACCOUNTANT: false },
        STATUS_CHANGED:     { MANAGER: false, DISPATCHER: true,  ACCOUNTANT: false },
        COD_ALERT:          { MANAGER: true,  DISPATCHER: false, ACCOUNTANT: true  },
        EXPENSE_ALERT:      { MANAGER: true,  DISPATCHER: false, ACCOUNTANT: true  },
      },
    },
    zones: [
      { id: 'z1', name: 'Lagos Island', basePrice: 1500 },
      { id: 'z2', name: 'Victoria Island', basePrice: 1500 },
      { id: 'z3', name: 'Lekki', basePrice: 2000 },
      { id: 'z4', name: 'Ikeja', basePrice: 2500 },
      { id: 'z5', name: 'Yaba', basePrice: 2000 },
    ],
  },
  'get /users': [
    { id: 'mock-001', firstName: 'Admin', lastName: 'User', email: 'admin@cityrider.com', role: 'ADMINISTRATOR', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'mock-002', firstName: 'Dispatch', lastName: 'Mgr', email: 'dispatcher@cityrider.com', role: 'DISPATCHER', status: 'ACTIVE', createdAt: '2026-01-15T00:00:00Z' },
    { id: 'mock-003', firstName: 'John', lastName: 'Rider', email: 'rider@cityrider.com', role: 'RIDER', status: 'ACTIVE', createdAt: '2026-02-01T00:00:00Z' },
    { id: 'mock-004', firstName: 'Emeka', lastName: 'Obi', email: 'emeka@cityrider.com', role: 'RIDER', status: 'ACTIVE', createdAt: '2026-03-01T00:00:00Z' },
  ],

  // -- Public tracking ----------------------------------------------------------
  'get /track/CRD-DEMO001': {
    trackingNumber: 'CRD-DEMO001',
    status: 'IN_TRANSIT',
    destCity: 'Lagos',
    destCountry: 'Nigeria',
    statusHistory: [
      { status: 'REGISTERED', note: 'Package registered', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { status: 'AWAITING_ASSIGNMENT', note: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
      { status: 'ASSIGNED', note: 'Assigned to rider', createdAt: new Date(Date.now() - 3600000 * 8).toISOString() },
      { status: 'PICKED_UP', note: 'Package picked up', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
      { status: 'IN_TRANSIT', note: 'Out for delivery', createdAt: new Date(Date.now() - 3600000).toISOString() },
    ],
  },

  // -- Phase 2.5: Kanban board data ---------------------------------------------
  'get /packages/kanban': [
    { id: 'p1', trackingNumber: 'CRD-MK0000001', status: 'AWAITING_ASSIGNMENT', recipient: { name: 'Bob Smith', area: 'Lagos Island' }, weight: 2.5 },
    { id: 'p4', trackingNumber: 'CRD-MK0000004', status: 'AWAITING_ASSIGNMENT', recipient: { name: 'Chidi Nkem', area: 'Victoria Island' }, weight: 1.0 },
    { id: 'p2', trackingNumber: 'CRD-MK0000002', status: 'ASSIGNED', recipient: { name: 'Jane Doe', area: 'Lekki' }, weight: 1.2, rider: { user: { firstName: 'Emeka', lastName: 'Obi' }, zone: { id: 'z1', name: 'Lagos Island' } } },
    { id: 'p5', trackingNumber: 'CRD-MK0000005', status: 'ASSIGNED', recipient: { name: 'Tunde Adex', area: 'Ikeja' }, weight: 3.0, rider: { user: { firstName: 'Fatima', lastName: 'Musa' }, zone: { id: 'z2', name: 'Victoria Island' } } },
    { id: 'p6', trackingNumber: 'CRD-MK0000006', status: 'PICKED_UP', recipient: { name: 'Ngozi Obi', area: 'Yaba' }, weight: 0.5, rider: { user: { firstName: 'Emeka', lastName: 'Obi' }, zone: { id: 'z1', name: 'Lagos Island' } } },
    { id: 'p7', trackingNumber: 'CRD-MK0000007', status: 'IN_TRANSIT', recipient: { name: 'Aisha Bello', area: 'Surulere' }, weight: 1.8, rider: { user: { firstName: 'Fatima', lastName: 'Musa' }, zone: { id: 'z2', name: 'Victoria Island' } } },
    { id: 'p8', trackingNumber: 'CRD-MK0000008', status: 'IN_TRANSIT', recipient: { name: 'Emeka Chi', area: 'Apapa' }, weight: 4.2, rider: { user: { firstName: 'Emeka', lastName: 'Obi' }, zone: { id: 'z1', name: 'Lagos Island' } } },
    { id: 'p3', trackingNumber: 'CRD-MK0000003', status: 'DELIVERED', recipient: { name: 'Test User', area: 'Port Harcourt' }, weight: 0.8, rider: { user: { firstName: 'Fatima', lastName: 'Musa' }, zone: { id: 'z2', name: 'Victoria Island' } } },
    { id: 'p9', trackingNumber: 'CRD-MK0000009', status: 'DELIVERED', recipient: { name: 'Kemi Ade', area: 'Abuja' }, weight: 1.5, rider: { user: { firstName: 'Emeka', lastName: 'Obi' }, zone: { id: 'z1', name: 'Lagos Island' } } },
  ],

  // -- Phase 3: Reports (P&L + Customer Activity) -------------------------------
  'get /reports/profit-loss': {
    revenue: 272000,
    expenses: 137000,
    profit: 135000,
    margin: 49.6,
    byMonth: [
      { month: 'Sep', revenue: 210000, expenses: 110000 },
      { month: 'Oct', revenue: 245000, expenses: 125000 },
      { month: 'Nov', revenue: 272000, expenses: 137000 },
    ],
    expenseBreakdown: [
      { category: 'Fuel', amount: 45000 },
      { category: 'Salary', amount: 80000 },
      { category: 'Maintenance', amount: 25000 },
      { category: 'Office', amount: 5000 },
      { category: 'Marketing', amount: 12000 },
    ],
  },
  'get /reports/customer-activity': [
    { name: 'Alice Corp', shipments: 18, spend: 45000, lastShipment: '2026-11-19' },
    { name: 'XYZ Ltd', shipments: 14, spend: 35000, lastShipment: '2026-11-18' },
    { name: 'Demo Sender', shipments: 9, spend: 22500, lastShipment: '2026-11-17' },
    { name: 'Tech Solutions', shipments: 7, spend: 17500, lastShipment: '2026-11-15' },
    { name: 'City Mart', shipments: 5, spend: 12500, lastShipment: '2026-11-14' },
  ],

  // -- Individual resource detail mocks ----------------------------------------
  'get /packages/p1': {
    id: 'p1', trackingNumber: 'CRD-MK0000001', status: 'IN_TRANSIT',
    description: 'Electronics', weight: 2.5, deliveryFee: 2500, specialInstructions: 'Handle with care',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    sender: { id: 'c1', name: 'Alice Corp', phone: '+2348001234567' },
    recipient: { id: 'c2', name: 'Bob Smith', phone: '+2348007654321', deliveryNotes: 'Call before delivery' },
    originStreet: '12 Marina St', originCity: 'Lagos',
    destStreet: '24 Broad St', destCity: 'Lagos',
    assignments: [{ id: 'a1', isActive: true, assignedAt: new Date(Date.now() - 3600000 * 8).toISOString(), rider: { user: { firstName: 'Emeka', lastName: 'Obi', phone: '+2348031111111' } } }],
    statusHistory: [
      { id: 'sh1', status: 'REGISTERED', note: 'Package registered', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
      { id: 'sh2', status: 'AWAITING_ASSIGNMENT', note: null, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'sh3', status: 'ASSIGNED', note: 'Assigned to Emeka', createdAt: new Date(Date.now() - 3600000 * 10).toISOString() },
      { id: 'sh4', status: 'PICKED_UP', note: 'Package picked up', createdAt: new Date(Date.now() - 3600000 * 8).toISOString() },
      { id: 'sh5', status: 'IN_TRANSIT', note: 'Out for delivery', createdAt: new Date(Date.now() - 3600000).toISOString() },
    ],
  },
  'get /packages/p2': {
    id: 'p2', trackingNumber: 'CRD-MK0000002', status: 'ASSIGNED',
    description: 'Documents', weight: 1.2, deliveryFee: 1800, specialInstructions: null,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    sender: { id: 'c2', name: 'XYZ Ltd', phone: '+2348007654321' },
    recipient: { id: 'c3', name: 'Jane Doe', phone: '+2348009999999', deliveryNotes: null },
    originStreet: '5 Gwarinpa Ave', originCity: 'Abuja',
    destStreet: '8 Wuse Zone 5', destCity: 'Abuja',
    assignments: [{ id: 'a2', isActive: true, assignedAt: new Date(Date.now() - 3600000 * 4).toISOString(), rider: { user: { firstName: 'Fatima', lastName: 'Musa', phone: '+2348032222222' } } }],
    statusHistory: [
      { id: 'sh6', status: 'REGISTERED', note: null, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'sh7', status: 'AWAITING_ASSIGNMENT', note: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'sh8', status: 'ASSIGNED', note: 'Assigned to Fatima', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
    ],
  },
  'get /packages/p3': {
    id: 'p3', trackingNumber: 'CRD-MK0000003', status: 'DELIVERED',
    description: 'Clothing', weight: 0.8, deliveryFee: 1500, specialInstructions: null,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    sender: { id: 'c3', name: 'Demo Sender', phone: '+2348005555555' },
    recipient: { id: 'c4', name: 'Test User', phone: '+2348006666666', deliveryNotes: null },
    originStreet: '7 Rumuola Rd', originCity: 'Port Harcourt',
    destStreet: '15 Ada George Rd', destCity: 'Port Harcourt',
    assignments: [{ id: 'a3', isActive: false, assignedAt: new Date(Date.now() - 86400000 * 4).toISOString(), rider: { user: { firstName: 'Fatima', lastName: 'Musa', phone: '+2348032222222' } } }],
    statusHistory: [
      { id: 'sh9', status: 'REGISTERED', note: null, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: 'sh10', status: 'ASSIGNED', note: null, createdAt: new Date(Date.now() - 86400000 * 4).toISOString() },
      { id: 'sh11', status: 'PICKED_UP', note: null, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
      { id: 'sh12', status: 'DELIVERED', note: 'Delivered successfully', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    ],
  },
  'get /riders/r1': {
    id: 'r1', riderId: 'RDR-001', status: 'ACTIVE', vehicleType: 'Motorcycle', vehiclePlate: 'LG-123-XY',
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    user: { id: 'u1', firstName: 'Emeka', lastName: 'Obi', email: 'emeka@cityrider.com', phone: '+2348031111111' },
  },
  'get /riders/r2': {
    id: 'r2', riderId: 'RDR-002', status: 'ACTIVE', vehicleType: 'Bicycle', vehiclePlate: null,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    user: { id: 'u2', firstName: 'Fatima', lastName: 'Musa', email: 'fatima@cityrider.com', phone: '+2348032222222' },
  },
  'get /riders/r1/cod-remittances': [
    { id: 'rem1', riderId: 'r1', packageId: 'p1', expectedAmount: 8000, collectedAmount: null, remittedAt: null, package: { trackingNumber: 'CRD-MK0000001', destCity: 'Lagos' } },
    { id: 'rem2', riderId: 'r1', packageId: 'p6', expectedAmount: 7000, collectedAmount: 7000, remittedAt: new Date(Date.now() - 86400000 * 2).toISOString(), package: { trackingNumber: 'CRD-MK0000006', destCity: 'Lagos' } },
  ],
  'get /riders/r2/cod-remittances': [
    { id: 'rem3', riderId: 'r2', packageId: 'p2', expectedAmount: 5500, collectedAmount: null, remittedAt: null, package: { trackingNumber: 'CRD-MK0000002', destCity: 'Abuja' } },
  ],
  'get /riders/r1/deliveries': [
    { id: 'a1', assignedAt: new Date(Date.now() - 3600000 * 8).toISOString(), package: { id: 'p1', trackingNumber: 'CRD-MK0000001', status: 'IN_TRANSIT', destCity: 'Lagos', updatedAt: new Date().toISOString(), recipient: { name: 'Bob Smith' } } },
    { id: 'a3-old', assignedAt: new Date(Date.now() - 86400000 * 10).toISOString(), package: { id: 'p6', trackingNumber: 'CRD-MK0000006', status: 'DELIVERED', destCity: 'Lagos', updatedAt: new Date(Date.now() - 86400000 * 9).toISOString(), recipient: { name: 'Ngozi Obi' } } },
  ],
  'get /riders/r2/deliveries': [
    { id: 'a2', assignedAt: new Date(Date.now() - 3600000 * 4).toISOString(), package: { id: 'p2', trackingNumber: 'CRD-MK0000002', status: 'ASSIGNED', destCity: 'Abuja', updatedAt: new Date().toISOString(), recipient: { name: 'Jane Doe' } } },
    { id: 'a3', assignedAt: new Date(Date.now() - 86400000 * 5).toISOString(), package: { id: 'p3', trackingNumber: 'CRD-MK0000003', status: 'DELIVERED', destCity: 'Port Harcourt', updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(), recipient: { name: 'Test User' } } },
  ],

  // -- Invoices (used by InvoicesTab) ------------------------------------------
  'get /invoices': [
    { id: 'inv1', invoiceNumber: 'INV-2026-001', customer: { id: 'c1', name: 'Alice Corp' }, _count: { lineItems: 18 }, totalAmount: 45000, dueDate: new Date(Date.now() + 86400000 * 10).toISOString(), status: 'SENT', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'inv2', invoiceNumber: 'INV-2026-002', customer: { id: 'c2', name: 'XYZ Ltd' }, _count: { lineItems: 14 }, totalAmount: 35000, dueDate: new Date(Date.now() + 86400000 * 5).toISOString(), status: 'PAID', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: 'inv3', invoiceNumber: 'INV-2026-003', customer: { id: 'c3', name: 'Demo Sender' }, _count: { lineItems: 9 }, totalAmount: 22500, dueDate: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'OVERDUE', createdAt: new Date(Date.now() - 86400000 * 15).toISOString() },
    { id: 'inv4', invoiceNumber: 'INV-2026-004', customer: { id: 'c4', name: 'Tech Solutions' }, _count: { lineItems: 7 }, totalAmount: 17500, dueDate: new Date(Date.now() + 86400000 * 15).toISOString(), status: 'PAID', createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
    { id: 'inv5', invoiceNumber: 'INV-2026-005', customer: { id: 'c5', name: 'City Mart' }, _count: { lineItems: 5 }, totalAmount: 12500, dueDate: new Date(Date.now() + 86400000 * 20).toISOString(), status: 'DRAFT', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  ],

  // -- Accounting ---------------------------------------------------------------
  'get /accounting/cod-reconciliation': [
    { riderId: 'r1', riderName: 'Emeka Obi', vehicle: 'Motorcycle', totalCollected: 23000, totalRemitted: 23000, variance: 0, lastActivity: new Date(Date.now() - 86400000).toISOString(), status: 'CLEAR', deliveries: 4 },
    { riderId: 'r2', riderName: 'Fatima Musa', vehicle: 'Bicycle', totalCollected: 15500, totalRemitted: 8000, variance: 7500, lastActivity: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'DISCREPANCY', deliveries: 3 },
    { riderId: 'r3', riderName: 'Chidi Okafor', vehicle: 'Motorcycle', totalCollected: 0, totalRemitted: 0, variance: 0, lastActivity: null, status: 'NO_COD', deliveries: 2 },
  ],
  'get /accounting/summary': {
    revenue: { total: 272000, deliveryFees: 215000, cod: 42000, other: 15000 },
    expenses: {
      total: 137000, salary: 80000, fuel: 25000, maintenance: 17000, marketing: 12000, office: 3000,
    },
    profit: 135000,
    cashBalance: 185000,
    receivables: 32000,
    monthlyTrend: [
      { month: 'Jun', revenue: 180000, expenses: 95000 },
      { month: 'Jul', revenue: 205000, expenses: 102000 },
      { month: 'Aug', revenue: 220000, expenses: 118000 },
      { month: 'Sep', revenue: 210000, expenses: 110000 },
      { month: 'Oct', revenue: 245000, expenses: 125000 },
      { month: 'Nov', revenue: 272000, expenses: 137000 },
    ],
  },
  'get /accounting/income': [
    { id: 'inc1', date: new Date(Date.now() - 86400000).toISOString(), source: 'Alice Corp', category: 'DeliveryFee', amount: 45000, method: 'BankTransfer', status: 'Collected' },
    { id: 'inc2', date: new Date(Date.now() - 86400000 * 2).toISOString(), source: 'XYZ Ltd', category: 'DeliveryFee', amount: 35000, method: 'BankTransfer', status: 'Collected' },
    { id: 'inc3', date: new Date(Date.now() - 86400000 * 3).toISOString(), source: 'Demo Sender', category: 'DeliveryFee', amount: 22500, method: 'Cash', status: 'Collected' },
    { id: 'inc4', date: new Date(Date.now() - 86400000 * 3).toISOString(), source: 'City Mart', category: 'COD', amount: 18500, method: 'Cash', status: 'Collected' },
    { id: 'inc5', date: new Date(Date.now() - 86400000 * 4).toISOString(), source: 'Tech Solutions', category: 'DeliveryFee', amount: 17500, method: 'Card', status: 'Collected' },
    { id: 'inc6', date: new Date(Date.now() - 86400000 * 5).toISOString(), source: 'Alice Corp', category: 'COD', amount: 23500, method: 'Cash', status: 'Pending' },
    { id: 'inc7', date: new Date(Date.now() - 86400000 * 6).toISOString(), source: 'XYZ Ltd', category: 'DeliveryFee', amount: 32000, method: 'BankTransfer', status: 'Pending' },
    { id: 'inc8', date: new Date(Date.now() - 86400000 * 6).toISOString(), source: 'City Mart', category: 'Other', amount: 15000, method: 'Cash', status: 'Collected' },
  ],
  'get /accounting/invoices': [
    { id: 'inv1', number: 'INV-2026-001', customer: 'Alice Corp', shipments: 18, amount: 45000, dueDate: new Date(Date.now() + 86400000 * 10).toISOString(), status: 'Unpaid' },
    { id: 'inv2', number: 'INV-2026-002', customer: 'XYZ Ltd', shipments: 14, amount: 35000, dueDate: new Date(Date.now() + 86400000 * 5).toISOString(), status: 'Paid' },
    { id: 'inv3', number: 'INV-2026-003', customer: 'Demo Sender', shipments: 9, amount: 22500, dueDate: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'Overdue' },
    { id: 'inv4', number: 'INV-2026-004', customer: 'Tech Solutions', shipments: 7, amount: 17500, dueDate: new Date(Date.now() + 86400000 * 15).toISOString(), status: 'Paid' },
    { id: 'inv5', number: 'INV-2026-005', customer: 'City Mart', shipments: 5, amount: 12500, dueDate: new Date(Date.now() + 86400000 * 20).toISOString(), status: 'Unpaid' },
  ],

  // -- Live Tracking -------------------------------------------------------------
  'get /track/active': [
    {
      id: 'td1', packageId: 'p1', trackingNumber: 'CRD-MK0000001', status: 'IN_TRANSIT',
      riderName: 'Emeka Obi', riderPhone: '+2348031111111',
      lat: 6.509, lng: 3.375,
      lastUpdate: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      origin: 'Lagos Island', destination: 'Yaba', recipientName: 'Bob Smith',
    },
    {
      id: 'td2', packageId: 'p2', trackingNumber: 'CRD-MK0000002', status: 'ASSIGNED',
      riderName: 'Fatima Musa', riderPhone: '+2348032222222',
      lat: 6.428, lng: 3.418,
      lastUpdate: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      origin: 'Ikeja', destination: 'Lekki', recipientName: 'Jane Doe',
    },
    {
      id: 'td3', packageId: 'p6', trackingNumber: 'CRD-MK0000006', status: 'PICKED_UP',
      riderName: 'Emeka Obi', riderPhone: '+2348031111111',
      lat: 6.497, lng: 3.345,
      lastUpdate: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      origin: 'Yaba', destination: 'Surulere', recipientName: 'Ngozi Obi',
    },
  ],

  // -- Extended public tracking --------------------------------------------------
  'get /track/CRD-MK0000001': {
    trackingNumber: 'CRD-MK0000001',
    status: 'IN_TRANSIT',
    destCity: 'Yaba',
    destCountry: 'Nigeria',
    recipientName: 'Bob Smith',
    estimatedDelivery: new Date(Date.now() + 3600000 * 2).toISOString(),
    statusHistory: [
      { status: 'REGISTERED', note: 'Package registered', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
      { status: 'AWAITING_ASSIGNMENT', note: null, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { status: 'ASSIGNED', note: 'Rider assigned', createdAt: new Date(Date.now() - 3600000 * 10).toISOString() },
      { status: 'PICKED_UP', note: 'Package picked up from sender', createdAt: new Date(Date.now() - 3600000 * 8).toISOString() },
      { status: 'IN_TRANSIT', note: 'Out for delivery', createdAt: new Date(Date.now() - 3600000).toISOString() },
    ],
  },
  'get /track/CRD-MK0000002': {
    trackingNumber: 'CRD-MK0000002',
    status: 'DELIVERY_ATTEMPTED',
    destCity: 'Ikeja',
    destCountry: 'Nigeria',
    recipientName: 'Grace Adeleke',
    estimatedDelivery: null,
    statusHistory: [
      { status: 'REGISTERED', note: 'Package registered', createdAt: new Date(Date.now() - 86400000 * 4).toISOString() },
      { status: 'ASSIGNED', note: 'Rider assigned', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
      { status: 'PICKED_UP', note: 'Package picked up from sender', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { status: 'DELIVERY_ATTEMPTED', note: 'Recipient not available at address', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
    ],
  },
  'get /track/CRD-MK0000003': {
    trackingNumber: 'CRD-MK0000003',
    status: 'DELIVERED',
    destCity: 'Port Harcourt',
    destCountry: 'Nigeria',
    recipientName: 'Test User',
    estimatedDelivery: null,
    statusHistory: [
      { status: 'REGISTERED', note: null, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
      { status: 'ASSIGNED', note: null, createdAt: new Date(Date.now() - 86400000 * 4).toISOString() },
      { status: 'PICKED_UP', note: null, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
      { status: 'DELIVERED', note: 'Delivered successfully, signed by recipient', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    ],
  },

  // -- Phase 2: Reports ---------------------------------------------------------
  'get /reports/delivery-summary': {
    byDay: [
      { date: '11/13', delivered: 8, failed: 1 },
      { date: '11/14', delivered: 12, failed: 2 },
      { date: '11/15', delivered: 10, failed: 1 },
      { date: '11/16', delivered: 15, failed: 3 },
      { date: '11/17', delivered: 7, failed: 0 },
      { date: '11/18', delivered: 11, failed: 2 },
      { date: '11/19', delivered: 5, failed: 1 },
    ],
    byStatus: [
      { name: 'Delivered', value: 68 },
      { name: 'In Transit', value: 8 },
      { name: 'Assigned', value: 5 },
      { name: 'Failed', value: 10 },
      { name: 'Returned', value: 3 },
    ],
    total: 94, totalDelivered: 68, successRate: 72,
  },
  'get /reports/revenue': {
    byDay: [
      { date: '11/13', amount: 32000 },
      { date: '11/14', amount: 48000 },
      { date: '11/15', amount: 40000 },
      { date: '11/16', amount: 60000 },
      { date: '11/17', amount: 28000 },
      { date: '11/18', amount: 44000 },
      { date: '11/19', amount: 20000 },
    ],
    byMethod: [
      { method: 'Cash', amount: 142000 },
      { method: 'BankTransfer', amount: 86000 },
      { method: 'Card', amount: 44000 },
      { method: 'Credit', amount: 10000 },
    ],
    total: 272000,
  },
  'get /reports/rider-performance': [
    { riderName: 'Emeka Obi',   deliveries: 32, successRate: 94, earnings: 32000, avgDeliveryHours: 3.2, onTimeRate: 91, zone: 'Lagos Island' },
    { riderName: 'Fatima Musa', deliveries: 28, successRate: 89, earnings: 28000, avgDeliveryHours: 3.8, onTimeRate: 86, zone: 'Victoria Island' },
    { riderName: 'Chidi Nkem',  deliveries: 15, successRate: 80, earnings: 15000, avgDeliveryHours: 4.5, onTimeRate: 73, zone: 'Lekki' },
    { riderName: 'Amaka Eze',   deliveries: 12, successRate: 75, earnings: 12000, avgDeliveryHours: 5.1, onTimeRate: 67, zone: 'Ikeja' },
  ],
  'get /reports/sla-breach': {
    breachRate: 23,
    totalPackages: 94,
    breachedPackages: 22,
    avgDeliveryHours: 4.2,
    slaHours: 4,
    byZone: [
      { zone: 'Lagos Island',    packages: 25, breached: 4,  breachRate: 16 },
      { zone: 'Victoria Island', packages: 20, breached: 5,  breachRate: 25 },
      { zone: 'Lekki',          packages: 18, breached: 7,  breachRate: 39 },
      { zone: 'Ikeja',          packages: 16, breached: 4,  breachRate: 25 },
      { zone: 'Yaba',           packages: 15, breached: 2,  breachRate: 13 },
    ],
    byDay: [
      { date: '11/15', delivered: 10, breached: 2 },
      { date: '11/16', delivered: 15, breached: 4 },
      { date: '11/17', delivered: 7,  breached: 3 },
      { date: '11/18', delivered: 11, breached: 2 },
      { date: '11/19', delivered: 5,  breached: 1 },
      { date: '11/20', delivered: 9,  breached: 4 },
      { date: '11/21', delivered: 8,  breached: 2 },
    ],
    topBreached: [
      { trackingNumber: 'CRD-MK0000005', zone: 'Lekki',          deliveryHours: 7.5, slaHours: 4 },
      { trackingNumber: 'CRD-MK0000007', zone: 'Lekki',          deliveryHours: 6.2, slaHours: 4 },
      { trackingNumber: 'CRD-MK0000008', zone: 'Ikeja',          deliveryHours: 5.9, slaHours: 4 },
      { trackingNumber: 'CRD-MK0000009', zone: 'Victoria Island', deliveryHours: 5.4, slaHours: 4 },
      { trackingNumber: 'CRD-MK0000010', zone: 'Lagos Island',   deliveryHours: 4.8, slaHours: 4 },
    ],
  },
  'get /reports/revenue-by-zone': {
    total: 272000,
    byZone: [
      { zone: 'Lagos Island',    revenue: 85000, deliveries: 32, avgFee: 2656 },
      { zone: 'Victoria Island', revenue: 72000, deliveries: 25, avgFee: 2880 },
      { zone: 'Lekki',          revenue: 65000, deliveries: 20, avgFee: 3250 },
      { zone: 'Ikeja',          revenue: 32000, deliveries: 11, avgFee: 2909 },
      { zone: 'Yaba',           revenue: 18000, deliveries: 6,  avgFee: 3000 },
    ],
  },
  'get /assignments/conflicts': [
    {
      riderId: 'r1',
      riderName: 'Emeka Obi',
      conflictPackages: [
        { id: 'p1', trackingNumber: 'CRD-MK0000001', destCity: 'Yaba',     deliveryWindow: '14:00–15:00' },
        { id: 'p6', trackingNumber: 'CRD-MK0000006', destCity: 'Surulere', deliveryWindow: '14:30–15:30' },
      ],
    },
  ],

  // -- Phase 6: Smart Operations -------------------------------------------------
  'get /riders/smart-dispatch': [
    { id: 'r1', score: 92, scoreLabel: 'Best Match', zoneMatch: true,  currentLoad: 2, onTimeRate: 91, vehicleType: 'Motorcycle', zone: { name: 'Lagos Island'    }, user: { firstName: 'Emeka', lastName: 'Obi',   phone: '+2348031111111' } },
    { id: 'r2', score: 74, scoreLabel: 'Good',       zoneMatch: false, currentLoad: 1, onTimeRate: 86, vehicleType: 'Bicycle',    zone: { name: 'Victoria Island' }, user: { firstName: 'Fatima', lastName: 'Musa',  phone: '+2348032222222' } },
    { id: 'r3', score: 58, scoreLabel: 'Available',  zoneMatch: false, currentLoad: 0, onTimeRate: 73, vehicleType: 'Motorcycle', zone: { name: 'Lekki'           }, user: { firstName: 'Chidi',  lastName: 'Nkem',  phone: '+2348033333333' } },
  ],
  'get /packages/sla-alerts': [
    { id: 'p1', trackingNumber: 'CRD-MK0000001', status: 'IN_TRANSIT', destCity: 'Yaba',  hoursElapsed: 4.5, slaHours: 4, isBreached: true,  riderName: 'Emeka Obi'   },
    { id: 'p7', trackingNumber: 'CRD-MK0000007', status: 'IN_TRANSIT', destCity: 'Ikeja', hoursElapsed: 3.7, slaHours: 4, isBreached: false, riderName: 'Fatima Musa' },
  ],

  'post /notifications/package-registered': { ok: true, smsSent: true, emailSent: true },

  // -- Customer Portal -----------------------------------------------------------
  'get /portal/dashboard': {
    customer: { id: 'c1', name: 'Alice Corp', email: 'customer@demo.com', phone: '+2348001234567' },
    stats: { total: 18, delivered: 14, inProgress: 3, failed: 1 },
    recent: [
      { id: 'p1', trackingNumber: 'CRD-MK0000001', status: 'IN_TRANSIT', destCity: 'Lagos', createdAt: new Date(Date.now() - 86400000).toISOString(), recipient: { name: 'Bob Smith' } },
      { id: 'p2', trackingNumber: 'CRD-MK0000002', status: 'DELIVERED', destCity: 'Abuja', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), recipient: { name: 'Jane Doe' } },
      { id: 'p3', trackingNumber: 'CRD-MK0000003', status: 'DELIVERY_ATTEMPTED', destCity: 'Port Harcourt', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), recipient: { name: 'Test User' } },
    ],
  },
  'get /portal/packages': {
    data: [
      { id: 'p1', trackingNumber: 'CRD-MK0000001', status: 'IN_TRANSIT', destCity: 'Lagos', createdAt: new Date(Date.now() - 86400000).toISOString(), recipient: { name: 'Bob Smith', deliveryAddress: '12 Marina Street, Lagos' }, statusHistory: [{ status: 'IN_TRANSIT', note: 'Out for delivery', createdAt: new Date(Date.now() - 3600000).toISOString() }, { status: 'PICKED_UP', note: null, createdAt: new Date(Date.now() - 7200000).toISOString() }] },
      { id: 'p2', trackingNumber: 'CRD-MK0000002', status: 'DELIVERED', destCity: 'Abuja', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), recipient: { name: 'Jane Doe', deliveryAddress: '8 Wuse Zone 5, Abuja' }, statusHistory: [{ status: 'DELIVERED', note: 'Delivered to recipient', createdAt: new Date(Date.now() - 86400000).toISOString() }] },
      { id: 'p3', trackingNumber: 'CRD-MK0000003', status: 'DELIVERY_ATTEMPTED', destCity: 'Port Harcourt', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), recipient: { name: 'Test User', deliveryAddress: '15 Ada George Rd, Port Harcourt' }, statusHistory: [{ status: 'DELIVERY_ATTEMPTED', note: 'Recipient did not answer call', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() }] },
    ],
    meta: { total: 3, page: 1, limit: 20 },
  },

  // -- Customer Service ----------------------------------------------------------
  'get /customer-service/packages/search': [
    { id: 'p1', trackingNumber: 'CRD-MK0000001', status: 'IN_TRANSIT', destCity: 'Lagos', senderId: 'c1', sender: { id: 'c1', name: 'Alice Corp', phone: '+2348001234567', email: 'alice@example.com' }, recipient: { name: 'Bob Smith', phone: '+2348009876543', deliveryAddress: '12 Marina Street, Lagos' }, statusHistory: [{ status: 'IN_TRANSIT', note: 'Out for delivery', createdAt: new Date(Date.now() - 3600000).toISOString() }] },
    { id: 'p2', trackingNumber: 'CRD-MK0000002', status: 'DELIVERED', destCity: 'Abuja', senderId: 'c1', sender: { id: 'c1', name: 'Alice Corp', phone: '+2348001234567', email: 'alice@example.com' }, recipient: { name: 'Jane Doe', phone: '+2348007654321', deliveryAddress: '8 Wuse Zone 5, Abuja' }, statusHistory: [{ status: 'DELIVERED', createdAt: new Date(Date.now() - 86400000).toISOString() }] },
    { id: 'p3', trackingNumber: 'CRD-MK0000003', status: 'DELIVERY_ATTEMPTED', destCity: 'Port Harcourt', senderId: 'c2', sender: { id: 'c2', name: 'Beta Ltd', phone: '+2348012345678', email: 'beta@example.com' }, recipient: { name: 'Test User', phone: '+2348005551234', deliveryAddress: '1 Aba Road, Port Harcourt' }, statusHistory: [{ status: 'DELIVERY_ATTEMPTED', note: 'Recipient not available', createdAt: new Date(Date.now() - 7200000).toISOString() }] },
  ],
  'get /customer-service/packages/p1': {
    id: 'p1', trackingNumber: 'CRD-MK0000001', status: 'IN_TRANSIT', destCity: 'Lagos', senderId: 'c1',
    sender: { id: 'c1', name: 'Alice Corp', phone: '+2348001234567', email: 'alice@example.com' },
    recipient: { name: 'Bob Smith', phone: '+2348009876543', deliveryAddress: '12 Marina Street, Lagos' },
    statusHistory: [
      { status: 'IN_TRANSIT', note: 'Package picked up by rider', createdAt: new Date(Date.now() - 3600000).toISOString(), performedBy: { firstName: 'Emeka', lastName: 'Obi' } },
      { status: 'PICKED_UP', note: null, createdAt: new Date(Date.now() - 7200000).toISOString(), performedBy: { firstName: 'Admin', lastName: 'User' } },
      { status: 'AWAITING_ASSIGNMENT', note: 'Package registered', createdAt: new Date(Date.now() - 86400000).toISOString(), performedBy: { firstName: 'Admin', lastName: 'User' } },
    ],
    assignments: [{ rider: { user: { firstName: 'Emeka', lastName: 'Obi', phone: '+2348003456789' } } }],
    interactions: [],
    escalations: [],
  },
  'get /customer-service/packages/p2': {
    id: 'p2', trackingNumber: 'CRD-MK0000002', status: 'DELIVERED', destCity: 'Abuja', senderId: 'c1',
    sender: { id: 'c1', name: 'Alice Corp', phone: '+2348001234567', email: 'alice@example.com' },
    recipient: { name: 'Jane Doe', phone: '+2348007654321', deliveryAddress: '8 Wuse Zone 5, Abuja' },
    statusHistory: [
      { status: 'DELIVERED', note: 'Delivered to recipient', createdAt: new Date(Date.now() - 86400000).toISOString(), performedBy: { firstName: 'Fatima', lastName: 'Musa' } },
      { status: 'IN_TRANSIT', note: null, createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), performedBy: { firstName: 'Admin', lastName: 'User' } },
    ],
    assignments: [{ rider: { user: { firstName: 'Fatima', lastName: 'Musa', phone: '+2348032222222' } } }],
    interactions: [],
    escalations: [],
  },
  'get /customer-service/packages/p3': {
    id: 'p3', trackingNumber: 'CRD-MK0000003', status: 'DELIVERY_ATTEMPTED', destCity: 'Port Harcourt', senderId: 'c2',
    sender: { id: 'c2', name: 'Beta Ltd', phone: '+2348012345678', email: 'beta@example.com' },
    recipient: { name: 'Test User', phone: '+2348005551234', deliveryAddress: '1 Aba Road, Port Harcourt' },
    statusHistory: [
      { status: 'DELIVERY_ATTEMPTED', note: 'Recipient not available', createdAt: new Date(Date.now() - 7200000).toISOString(), performedBy: { firstName: 'Fatima', lastName: 'Musa' } },
      { status: 'IN_TRANSIT', note: null, createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), performedBy: { firstName: 'Admin', lastName: 'User' } },
    ],
    assignments: [{ rider: { user: { firstName: 'Fatima', lastName: 'Musa', phone: '+2348032222222' } } }],
    interactions: [],
    escalations: [],
  },
  'get /customer-service/interactions': [],
  'get /customer-service/escalations': [
    { id: 'e1', priority: 'HIGH', status: 'OPEN', reason: 'Package stuck in transit for 3 days', requestedAction: 'Contact rider and investigate', createdAt: new Date(Date.now() - 86400000).toISOString(), raisedBy: { firstName: 'Jane', lastName: 'Staff' }, package: { trackingNumber: 'CRD-MK0000001', status: 'IN_TRANSIT', destCity: 'Lagos' }, customer: { name: 'Alice Corp', phone: '+2348001234567' } },
    { id: 'e2', priority: 'URGENT', status: 'IN_PROGRESS', reason: 'Recipient claims package was damaged', requestedAction: 'Issue refund or replacement', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), raisedBy: { firstName: 'Jane', lastName: 'Staff' }, package: { trackingNumber: 'CRD-MK0000003', status: 'DELIVERED', destCity: 'Port Harcourt' }, customer: { name: 'Beta Ltd', phone: '+2348012345678' } },
  ],
};

function isMock() {
  return typeof window !== 'undefined' && localStorage.getItem('cr_mock_mode') === '1';
}

const MOCK_STATUS_OVERRIDES: Record<string, string> = {};

function uid() { return Math.random().toString(36).slice(2, 9); }

function mockAdapter(config: any): Promise<any> {
  const method = (config.method ?? 'get').toLowerCase();
  const path = (config.url ?? '').split('?')[0];
  const key = `${method} ${path}`;
  const body = (() => { try { return typeof config.data === 'string' ? JSON.parse(config.data) : (config.data ?? {}); } catch { return {}; } })();
  const ok = (data: any = { ok: true }) => Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config, request: {} });
  const created = (data: any) => Promise.resolve({ data, status: 201, statusText: 'Created', headers: {}, config, request: {} });

  // Package status update
  if (method === 'patch' && /^\/packages\/[^/]+\/status$/.test(path)) {
    const pkgId = path.split('/')[2];
    if (body.status) {
      MOCK_STATUS_OVERRIDES[pkgId] = body.status;
      const pkg = ((MOCK_DB['get /packages'] as any).data as any[]).find((p: any) => p.id === pkgId);
      if (pkg) pkg.status = body.status;
      const kpkg = (MOCK_DB['get /packages/kanban'] as any[]).find((p: any) => p.id === pkgId);
      if (kpkg) kpkg.status = body.status;
    }
    return ok();
  }

  // Customers
  if (method === 'post' && path === '/customers') {
    const c = { id: 'c' + uid(), createdAt: new Date().toISOString(), ...body };
    (MOCK_DB['get /customers'] as any[]).push(c);
    return created(c);
  }
  if (method === 'patch' && /^\/customers\/[^/]+$/.test(path)) {
    const list = MOCK_DB['get /customers'] as any[];
    const item = list.find((c: any) => c.id === path.split('/')[2]);
    if (item) Object.assign(item, body);
    return ok(item ?? {});
  }
  if (method === 'delete' && /^\/customers\/[^/]+$/.test(path)) {
    const list = MOCK_DB['get /customers'] as any[];
    const idx = list.findIndex((c: any) => c.id === path.split('/')[2]);
    if (idx !== -1) list.splice(idx, 1);
    return ok();
  }

  // Riders
  if (method === 'post' && path === '/riders') {
    const r = { id: 'r' + uid(), status: 'ACTIVE', vehicleType: body.vehicleType ?? null, vehiclePlate: body.vehiclePlate ?? null, createdAt: new Date().toISOString(), user: { firstName: body.firstName ?? '', lastName: body.lastName ?? '', email: body.email ?? '', phone: body.phone ?? null } };
    (MOCK_DB['get /riders'] as any[]).push(r);
    (MOCK_DB['get /riders/active'] as any[]).push(r);
    return created(r);
  }
  if (method === 'patch' && /^\/riders\/[^/]+$/.test(path)) {
    const list = MOCK_DB['get /riders'] as any[];
    const item = list.find((r: any) => r.id === path.split('/')[2]);
    if (item) {
      const { firstName, lastName, email, phone, vehicleType, vehiclePlate } = body;
      if (firstName !== undefined) item.user.firstName = firstName;
      if (lastName !== undefined) item.user.lastName = lastName;
      if (email !== undefined) item.user.email = email;
      if (phone !== undefined) item.user.phone = phone;
      if (vehicleType !== undefined) item.vehicleType = vehicleType;
      if (vehiclePlate !== undefined) item.vehiclePlate = vehiclePlate;
    }
    return ok(item ?? {});
  }
  if (method === 'delete' && /^\/riders\/[^/]+$/.test(path)) {
    const id = path.split('/')[2];
    for (const k of ['get /riders', 'get /riders/active']) {
      const list = MOCK_DB[k] as any[];
      const idx = list.findIndex((r: any) => r.id === id);
      if (idx !== -1) list.splice(idx, 1);
    }
    return ok();
  }

  // Invoices
  if (method === 'post' && path === '/invoices') {
    const list = MOCK_DB['get /invoices'] as any[];
    const customers = MOCK_DB['get /customers'] as any[];
    const customer = customers.find((c: any) => c.id === body.customerId) ?? { id: body.customerId, name: 'Unknown' };
    const newInv = {
      id: 'inv' + uid(),
      invoiceNumber: 'INV-2026-' + String(list.length + 1).padStart(3, '0'),
      customer: { id: customer.id, name: customer.name },
      _count: { lineItems: 0 },
      totalAmount: 0,
      dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    };
    list.unshift(newInv);
    return created(newInv);
  }

  // Expenses
  if (method === 'post' && path === '/expenses') {
    const e = { id: 'exp' + uid(), createdAt: new Date().toISOString(), status: 'PendingApproval', currency: 'NGN', ...body };
    (MOCK_DB['get /expenses'] as any).data.push(e);
    return created(e);
  }
  if (method === 'patch' && /^\/expenses\/[^/]+\/approve$/.test(path)) {
    const expId = path.split('/')[2];
    const list = (MOCK_DB['get /expenses'] as any).data as any[];
    const item = list.find((e: any) => e.id === expId);
    if (item) item.status = 'Approved';
    return ok(item ?? {});
  }
  if (method === 'patch' && /^\/expenses\/[^/]+\/reject$/.test(path)) {
    const expId = path.split('/')[2];
    const list = (MOCK_DB['get /expenses'] as any).data as any[];
    const item = list.find((e: any) => e.id === expId);
    if (item) { item.status = 'Rejected'; item.rejectionReason = body.reason ?? ''; }
    return ok(item ?? {});
  }
  if (method === 'patch' && /^\/expenses\/[^/]+$/.test(path)) {
    const list = (MOCK_DB['get /expenses'] as any).data as any[];
    const item = list.find((e: any) => e.id === path.split('/')[2]);
    if (item) Object.assign(item, body);
    return ok(item ?? {});
  }
  if (method === 'delete' && /^\/expenses\/[^/]+$/.test(path)) {
    const list = (MOCK_DB['get /expenses'] as any).data as any[];
    const idx = list.findIndex((e: any) => e.id === path.split('/')[2]);
    if (idx !== -1) list.splice(idx, 1);
    return ok();
  }

  // Packages
  if (method === 'post' && path === '/recipients') {
    return created({ id: 'rec' + uid(), ...body });
  }
  if (method === 'post' && path === '/packages') {
    const id = 'p' + uid();
    const tn = 'CRD-MK' + String(Date.now()).slice(-7);
    const p = { id, trackingNumber: tn, status: 'AWAITING_ASSIGNMENT', createdAt: new Date().toISOString(), sender: { name: 'New Sender' }, recipient: { name: 'New Recipient' }, weight: body.weight ?? null, ...body };
    (MOCK_DB['get /packages'] as any).data.push(p);
    (MOCK_DB['get /packages/kanban'] as any[]).push({ id, trackingNumber: tn, status: 'AWAITING_ASSIGNMENT', recipient: { name: 'New Recipient', area: '' }, weight: body.weight ?? null });
    return created(p);
  }
  if (method === 'patch' && /^\/packages\/[^/]+$/.test(path)) {
    const list = (MOCK_DB['get /packages'] as any).data as any[];
    const item = list.find((p: any) => p.id === path.split('/')[2]);
    if (item) Object.assign(item, body);
    return ok(item ?? {});
  }
  if (method === 'delete' && /^\/packages\/[^/]+$/.test(path)) {
    const id = path.split('/')[2];
    const list = (MOCK_DB['get /packages'] as any).data as any[];
    const idx = list.findIndex((p: any) => p.id === id);
    if (idx !== -1) list.splice(idx, 1);
    const kanban = MOCK_DB['get /packages/kanban'] as any[];
    const kidx = kanban.findIndex((p: any) => p.id === id);
    if (kidx !== -1) kanban.splice(kidx, 1);
    return ok();
  }
  if (method === 'post' && /^\/packages\/[^/]+\/assign$/.test(path)) {
    const pkgId = path.split('/')[2];
    if (body.riderId) {
      const kanban = MOCK_DB['get /packages/kanban'] as any[];
      const kpkg = kanban.find((p: any) => p.id === pkgId);
      const riders = MOCK_DB['get /riders'] as any[];
      const rider = riders.find((r: any) => r.id === body.riderId);
      if (kpkg && rider) { kpkg.status = 'ASSIGNED'; kpkg.rider = { user: { firstName: rider.user.firstName, lastName: rider.user.lastName } }; MOCK_STATUS_OVERRIDES[pkgId] = 'ASSIGNED'; }
    }
    return ok();
  }

  // Payments
  if (method === 'post' && path === '/payments') {
    const p = { id: 'pay' + uid(), createdAt: new Date().toISOString(), currency: 'NGN', status: 'Paid', ...body };
    (MOCK_DB['get /payments'] as any).data.push(p);
    return created(p);
  }
  if (method === 'delete' && /^\/payments\/[^/]+$/.test(path)) {
    const list = (MOCK_DB['get /payments'] as any).data as any[];
    const idx = list.findIndex((p: any) => p.id === path.split('/')[2]);
    if (idx !== -1) list.splice(idx, 1);
    return ok();
  }

  // Users
  if (method === 'post' && path === '/users') {
    const u = { id: 'u' + uid(), status: 'ACTIVE', createdAt: new Date().toISOString(), ...body };
    (MOCK_DB['get /users'] as any[]).push(u);
    return created(u);
  }
  if (method === 'patch' && /^\/users\/[^/]+$/.test(path)) {
    const list = MOCK_DB['get /users'] as any[];
    const item = list.find((u: any) => u.id === path.split('/')[2]);
    if (item) Object.assign(item, body);
    return ok(item ?? {});
  }
  if (method === 'post' && /^\/users\/[^/]+\/resend-invite$/.test(path)) {
    return ok({ sent: true });
  }
  if (method === 'delete' && /^\/users\/[^/]+$/.test(path)) {
    const list = MOCK_DB['get /users'] as any[];
    const idx = list.findIndex((u: any) => u.id === path.split('/')[2]);
    if (idx !== -1) list.splice(idx, 1);
    return ok();
  }

  // Settings
  if (method === 'patch' && path === '/settings') {
    Object.assign(MOCK_DB['get /settings'], body);
    return ok(MOCK_DB['get /settings']);
  }

  // Tracking — reschedule request (public, no auth)
  if (method === 'post' && /^\/track\/[^/]+\/reschedule$/.test(path)) {
    return ok({ ok: true, message: 'Rescheduling request received' });
  }

  // Tracking — dispute (public, no auth)
  if (method === 'post' && /^\/track\/[^/]+\/dispute$/.test(path)) {
    return ok({ ok: true, message: 'Dispute submitted successfully' });
  }

  // Misc write endpoints
  if (method === 'post' && path === '/notifications/package-registered') {
    return ok({ ok: true, smsSent: true, emailSent: true });
  }
  if (method === 'get' && /^\/riders\/[^/]+\/cod-pending$/.test(path)) {
    return ok({ expectedAmount: 15000, packageCount: 3 });
  }
  if (method === 'post' && /^\/riders\/[^/]+\/handover$/.test(path)) {
    const variance = (body.actualAmount ?? 0) - 15000;
    return ok({ ok: true, amount: body.actualAmount, paidAt: new Date().toISOString(), isFlagged: Math.abs(variance) > 500, variance });
  }
  if (method === 'post' && /^\/settings\/zones$/.test(path)) {
    const zone = { id: `z${Date.now()}`, name: body.name, basePrice: body.basePrice ?? 1500 };
    (MOCK_DB['get /settings'] as any).zones.push(zone);
    return ok(zone);
  }
  if (method === 'delete' && /^\/settings\/zones\/[^/]+$/.test(path)) {
    const zId = path.split('/').pop();
    const zones = (MOCK_DB['get /settings'] as any).zones as any[];
    const idx = zones.findIndex((z: any) => z.id === zId);
    if (idx !== -1) zones.splice(idx, 1);
    return ok({ ok: true });
  }
  if (method === 'patch' && /^\/riders\/[^/]+\/zone$/.test(path)) {
    const rId = path.split('/')[2];
    const riders = MOCK_DB['get /riders'] as any[];
    const activeRiders = MOCK_DB['get /riders/active'] as any[];
    const zones = (MOCK_DB['get /settings'] as any).zones as any[];
    const zone = body.zoneId ? zones.find((z: any) => z.id === body.zoneId) ?? null : null;
    for (const list of [riders, activeRiders]) {
      const r = list.find((r: any) => r.id === rId);
      if (r) { r.zoneId = body.zoneId ?? null; r.zone = zone; }
    }
    return ok({ ok: true, zoneId: body.zoneId, zone });
  }

  // Rider COD remittances
  if (method === 'get' && /^\/riders\/[^/]+\/cod-remittances$/.test(path)) {
    const rId = path.split('/')[2];
    return ok((MOCK_DB[`get /riders/${rId}/cod-remittances`] ?? []) as any[]);
  }
  if (method === 'patch' && /^\/riders\/[^/]+\/cod-remittances\/[^/]+\/confirm$/.test(path)) {
    const parts = path.split('/');
    const rId = parts[2];
    const remId = parts[4];
    const list = (MOCK_DB[`get /riders/${rId}/cod-remittances`] ?? []) as any[];
    const rem = list.find((r: any) => r.id === remId);
    if (rem) { rem.collectedAmount = body.collectedAmount; rem.remittedAt = new Date().toISOString(); }
    return ok(rem ?? {});
  }
  if (method === 'get' && /^\/riders\/[^/]+\/expense-summary$/.test(path)) {
    return ok({ total: 15000, breakdown: [{ category: 'FUEL', total: 8000 }, { category: 'MAINTENANCE', total: 7000 }] });
  }
  if (method === 'patch' && /^\/riders\/[^/]+\/status$/.test(path)) {
    const rId = path.split('/')[2];
    const newStatus = body.status;
    const riderList = MOCK_DB['get /riders'] as any[];
    const activeList = MOCK_DB['get /riders/active'] as any[];
    for (const list of [riderList, activeList]) {
      const r = list.find((r: any) => r.id === rId);
      if (r) r.status = newStatus;
    }
    const detail = MOCK_DB[`get /riders/${rId}`] as any;
    if (detail) detail.status = newStatus;
    return ok({ ok: true, status: newStatus });
  }

  // Phase 6: Smart dispatch manifest
  if (method === 'post' && path === '/dispatch/manifests') {
    return ok({ ok: true, manifestId: 'mfst' + uid() });
  }

  // Phase 6: Bulk status update
  if (method === 'post' && path === '/packages/bulk-status') {
    const { packageIds, status: newSt } = body;
    if (Array.isArray(packageIds) && newSt) {
      const list = (MOCK_DB['get /packages'] as any).data as any[];
      for (const id of packageIds) {
        const pkg = list.find((p: any) => p.id === id);
        if (pkg) pkg.status = newSt;
        MOCK_STATUS_OVERRIDES[id] = newSt;
      }
    }
    return ok({ ok: true, updated: (packageIds ?? []).length });
  }

  // Phase 6: Portal delivery request
  if (method === 'post' && path === '/portal/delivery-requests') {
    const req = {
      id: 'dr' + uid(),
      trackingNumber: 'CRD-MK' + String(Date.now()).slice(-7),
      status: 'AWAITING_ASSIGNMENT',
      createdAt: new Date().toISOString(),
      destCity: body.destCity ?? '',
      recipient: { name: body.recipientName ?? '', phone: body.recipientPhone ?? '' },
    };
    (MOCK_DB['get /portal/dashboard'] as any).recent.unshift(req);
    (MOCK_DB['get /portal/dashboard'] as any).stats.total += 1;
    (MOCK_DB['get /portal/dashboard'] as any).stats.inProgress += 1;
    return created(req);
  }

  // Customer Service mutations
  if (method === 'post' && path === '/customer-service/interactions') {
    const interaction = { id: 'int' + uid(), createdAt: new Date().toISOString(), ...body };
    (MOCK_DB['get /customer-service/interactions'] as any[]).push(interaction);
    const pkgKey = `get /customer-service/packages/${body.packageId}`;
    if (MOCK_DB[pkgKey]) (MOCK_DB[pkgKey] as any).interactions?.push(interaction);
    return created(interaction);
  }
  if (method === 'post' && path === '/customer-service/escalations') {
    const escalation = { id: 'esc' + uid(), status: 'OPEN', createdAt: new Date().toISOString(), raisedBy: { firstName: 'Staff', lastName: 'User' }, package: { trackingNumber: 'CRD-' + uid(), status: 'IN_TRANSIT', destCity: 'Lagos' }, customer: { name: 'Customer', phone: '' }, ...body };
    (MOCK_DB['get /customer-service/escalations'] as any[]).push(escalation);
    return created(escalation);
  }
  if (method === 'patch' && /^\/customer-service\/escalations\/[^/]+$/.test(path)) {
    const escId = path.split('/').pop();
    const list = MOCK_DB['get /customer-service/escalations'] as any[];
    const item = list.find((e: any) => e.id === escId);
    if (item) Object.assign(item, body);
    return ok(item ?? {});
  }

  // GET fallthrough
  let result: any = MOCK_DB[key] ?? (method === 'get' ? [] : { ok: true });

  if (method === 'get' && key === 'get /packages/kanban' && Array.isArray(result)) {
    result = result.map((p: any) => {
      const override = MOCK_STATUS_OVERRIDES[p.id];
      return override ? { ...p, status: override } : p;
    });
  }

  function applyFilters(arr: any[], params: any): any[] {
    let out = arr;
    const from = params.from ? new Date(params.from).getTime() : null;
    const to = params.to ? new Date(params.to + 'T23:59:59').getTime() : null;
    if (from || to) {
      out = out.filter((item: any) => {
        const ts = item.createdAt ? new Date(item.createdAt).getTime() : null;
        if (!ts) return true;
        if (from && ts < from) return false;
        if (to && ts > to) return false;
        return true;
      });
    }
    if (params.search) {
      const q = String(params.search).toLowerCase();
      out = out.filter((item: any) => JSON.stringify(item).toLowerCase().includes(q));
    }
    if (params.category) out = out.filter((item: any) => item.category === params.category);
    if (params.status) out = out.filter((item: any) => item.status === params.status);
    if (params.type) out = out.filter((item: any) => item.type === params.type);
    if (params.method) out = out.filter((item: any) => item.method === params.method);
    return out;
  }

  if (method === 'get') {
    const params = config.params ?? {};
    if (Array.isArray(result)) {
      result = applyFilters(result, params);
    } else if (result && typeof result === 'object' && Array.isArray(result.data)) {
      const filtered = applyFilters(result.data, params);
      result = { ...result, data: filtered, meta: result.meta ? { ...result.meta, total: filtered.length } : undefined };
    }
  }

  return Promise.resolve({ data: result, status: 200, statusText: 'OK', headers: {}, config, request: {} });
}

// --- Axios instance -----------------------------------------------------------

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cr_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (isMock()) config.adapter = mockAdapter;
  }
  return config;
});

let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const refreshToken = localStorage.getItem('cr_refresh_token');
      if (!refreshToken) throw new Error('No refresh token');
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/auth/refresh`,
        { refreshToken },
      );
      localStorage.setItem('cr_access_token', data.accessToken);
      localStorage.setItem('cr_refresh_token', data.refreshToken);
      queue.forEach((cb) => cb(data.accessToken));
      queue = [];
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch {
      localStorage.removeItem('cr_access_token');
      localStorage.removeItem('cr_refresh_token');
      document.cookie = 'cr_session=; max-age=0; path=/';
      document.cookie = 'cr_role=; max-age=0; path=/';
      window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);
