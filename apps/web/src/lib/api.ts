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
    maxActiveAssignments: 5,
    bankName: 'First Bank Nigeria',
    accountNumber: '3012345678',
    accountName: 'City Riders Logistics Ltd',
    invoicePaymentTermsDays: 30,
    invoiceFooterNote: 'Payment due within the agreed number of days. Late payment attracts 2% monthly interest. Thank you for your business.',
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

  // -- Kanban package detail entries (p4-p9) ------------------------------------
  'get /packages/p4': { id: 'p4', trackingNumber: 'CRD-MK0000004', status: 'AWAITING_ASSIGNMENT', description: 'Documents', weight: 1.0, deliveryFee: 1500, specialInstructions: null, createdAt: new Date(Date.now() - 86400000).toISOString(), sender: { name: 'Alice Corp', phone: '+2348001234567', email: 'alice@example.com' }, recipient: { name: 'Chidi Nkem', phone: '+2348011234567', deliveryAddress: '5 Victoria Island, Lagos' }, destCity: 'Lagos', zoneId: 'z2', statusHistory: [{ id: 'sh-p4-1', status: 'AWAITING_ASSIGNMENT', note: null, createdAt: new Date(Date.now() - 86400000).toISOString() }] },
  'get /packages/p5': { id: 'p5', trackingNumber: 'CRD-MK0000005', status: 'ASSIGNED', description: 'Household goods', weight: 3.0, deliveryFee: 2200, specialInstructions: null, createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), sender: { name: 'Alice Corp', phone: '+2348001234567', email: 'alice@example.com' }, recipient: { name: 'Tunde Adex', phone: '+2348021234567', deliveryAddress: '10 Allen Ave, Ikeja' }, destCity: 'Ikeja', zoneId: 'z3', statusHistory: [{ id: 'sh-p5-1', status: 'AWAITING_ASSIGNMENT', note: null, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() }, { id: 'sh-p5-2', status: 'ASSIGNED', note: 'Assigned to Fatima', createdAt: new Date(Date.now() - 86400000).toISOString() }] },
  'get /packages/p6': { id: 'p6', trackingNumber: 'CRD-MK0000006', status: 'PICKED_UP', description: 'Clothing', weight: 0.5, deliveryFee: 1200, specialInstructions: null, createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), sender: { name: 'Beta Ltd', phone: '+2348012345678', email: 'beta@example.com' }, recipient: { name: 'Ngozi Obi', phone: '+2348031234567', deliveryAddress: '3 Herbert Macaulay Way, Yaba' }, destCity: 'Yaba', zoneId: 'z1', statusHistory: [{ id: 'sh-p6-1', status: 'AWAITING_ASSIGNMENT', note: null, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() }, { id: 'sh-p6-2', status: 'ASSIGNED', note: null, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() }, { id: 'sh-p6-3', status: 'PICKED_UP', note: null, createdAt: new Date(Date.now() - 86400000).toISOString() }] },
  'get /packages/p7': { id: 'p7', trackingNumber: 'CRD-MK0000007', status: 'IN_TRANSIT', description: 'Electronics', weight: 1.8, deliveryFee: 2000, specialInstructions: 'Fragile', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), sender: { name: 'Alice Corp', phone: '+2348001234567', email: 'alice@example.com' }, recipient: { name: 'Aisha Bello', phone: '+2348041234567', deliveryAddress: '8 Bode Thomas, Surulere' }, destCity: 'Surulere', zoneId: 'z1', statusHistory: [{ id: 'sh-p7-1', status: 'AWAITING_ASSIGNMENT', note: null, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() }, { id: 'sh-p7-2', status: 'IN_TRANSIT', note: 'Out for delivery', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() }] },
  'get /packages/p8': { id: 'p8', trackingNumber: 'CRD-MK0000008', status: 'IN_TRANSIT', description: 'Books', weight: 4.2, deliveryFee: 2800, specialInstructions: null, createdAt: new Date(Date.now() - 86400000 * 4).toISOString(), sender: { name: 'Beta Ltd', phone: '+2348012345678', email: 'beta@example.com' }, recipient: { name: 'Emeka Chi', phone: '+2348051234567', deliveryAddress: '2 Apapa Road, Apapa' }, destCity: 'Apapa', zoneId: 'z1', statusHistory: [{ id: 'sh-p8-1', status: 'AWAITING_ASSIGNMENT', note: null, createdAt: new Date(Date.now() - 86400000 * 4).toISOString() }, { id: 'sh-p8-2', status: 'IN_TRANSIT', note: 'En route', createdAt: new Date(Date.now() - 86400000).toISOString() }] },
  'get /packages/p9': { id: 'p9', trackingNumber: 'CRD-MK0000009', status: 'DELIVERED', description: 'Accessories', weight: 1.5, deliveryFee: 1600, specialInstructions: null, createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), sender: { name: 'Alice Corp', phone: '+2348001234567', email: 'alice@example.com' }, recipient: { name: 'Kemi Ade', phone: '+2348061234567', deliveryAddress: '15 Wuse II, Abuja' }, destCity: 'Abuja', zoneId: 'z2', statusHistory: [{ id: 'sh-p9-1', status: 'AWAITING_ASSIGNMENT', note: null, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() }, { id: 'sh-p9-2', status: 'IN_TRANSIT', note: null, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() }, { id: 'sh-p9-3', status: 'DELIVERED', note: 'Delivered successfully', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() }] },

  // -- Phase 3: Reports (P&L + Customer Activity) -------------------------------
  'get /reports/profit-loss': {
    revenue: 272000,
    expenses: 137000,
    profit: 135000,
    margin: 49.6,
    byMonth: [
      { month: 'Jun 26', revenue: 198000, expenses: 104000 },
      { month: 'Jul 26', revenue: 220000, expenses: 112000 },
      { month: 'Aug 26', revenue: 234000, expenses: 119000 },
      { month: 'Sep 26', revenue: 210000, expenses: 110000 },
      { month: 'Oct 26', revenue: 245000, expenses: 125000 },
      { month: 'Nov 26', revenue: 272000, expenses: 137000 },
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

  'get /reports/year-on-year': {
    thisYear: { packages: 1730, revenue: 3017000, deliveries: 1592, successRate: 92 },
    lastYear: { packages: 1420, revenue: 2380000, deliveries: 1278, successRate: 90 },
    monthly: [
      { month: 'Jan', thisYear: 220000, lastYear: 158000, thisYearPkgs: 128, lastYearPkgs: 94 },
      { month: 'Feb', thisYear: 198000, lastYear: 172000, thisYearPkgs: 115, lastYearPkgs: 102 },
      { month: 'Mar', thisYear: 265000, lastYear: 195000, thisYearPkgs: 154, lastYearPkgs: 116 },
      { month: 'Apr', thisYear: 280000, lastYear: 210000, thisYearPkgs: 162, lastYearPkgs: 125 },
      { month: 'May', thisYear: 310000, lastYear: 228000, thisYearPkgs: 180, lastYearPkgs: 136 },
      { month: 'Jun', thisYear: 295000, lastYear: 215000, thisYearPkgs: 171, lastYearPkgs: 128 },
      { month: 'Jul', thisYear: 272000, lastYear: 198000, thisYearPkgs: 158, lastYearPkgs: 118 },
      { month: 'Aug', thisYear: 318000, lastYear: 234000, thisYearPkgs: 185, lastYearPkgs: 139 },
      { month: 'Sep', thisYear: 302000, lastYear: 220000, thisYearPkgs: 175, lastYearPkgs: 131 },
      { month: 'Oct', thisYear: 285000, lastYear: 208000, thisYearPkgs: 165, lastYearPkgs: 124 },
      { month: 'Nov', thisYear: 272000, lastYear: 142000, thisYearPkgs: 137, lastYearPkgs: 85 },
      { month: 'Dec', thisYear: 0, lastYear: 200000, thisYearPkgs: 0, lastYearPkgs: 122 },
    ],
    quarterly: [
      { quarter: 'Q1', thisYearRev: 683000, lastYearRev: 525000, thisYearPkgs: 397, lastYearPkgs: 312 },
      { quarter: 'Q2', thisYearRev: 885000, lastYearRev: 653000, thisYearPkgs: 513, lastYearPkgs: 389 },
      { quarter: 'Q3', thisYearRev: 892000, lastYearRev: 652000, thisYearPkgs: 518, lastYearPkgs: 388 },
      { quarter: 'Q4 (partial)', thisYearRev: 557000, lastYearRev: 550000, thisYearPkgs: 302, lastYearPkgs: 331 },
    ],
  },

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

  // -- Invoice detail (full, with line items) -----------------------------------
  'get /invoices/inv1': {
    id: 'inv1', invoiceNumber: 'INV-2026-001', status: 'SENT',
    customer: { id: 'c1', name: 'Alice Corp', email: 'billing@alicecorp.ng', phone: '+2348001234567', address: '15 Broad Street, Lagos Island, Lagos' },
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    totalAmount: 45000, paidAmount: 0,
    bankName: 'First Bank Nigeria', accountNumber: '3012345678', accountName: 'City Riders Logistics Ltd',
    notes: 'Payment due within 10 days. Late payment attracts 2% monthly interest.',
    lineItems: [
      { id: 'li1', description: 'Delivery — Ikeja to Victoria Island', trackingNumber: 'CRD-MK0000001', quantity: 1, unitPrice: 3500, amount: 3500 },
      { id: 'li2', description: 'Delivery — Surulere to Lekki Phase 1', trackingNumber: 'CRD-MK0000008', quantity: 1, unitPrice: 4000, amount: 4000 },
      { id: 'li3', description: 'Delivery — Yaba to Ajah', trackingNumber: 'CRD-MK0000012', quantity: 1, unitPrice: 5500, amount: 5500 },
      { id: 'li4', description: 'Delivery — Mainland to Island (Express)', trackingNumber: 'CRD-MK0000017', quantity: 1, unitPrice: 7500, amount: 7500 },
      { id: 'li5', description: 'Bulk package handling (5 parcels)', trackingNumber: null, quantity: 5, unitPrice: 1500, amount: 7500 },
      { id: 'li6', description: 'COD Collection fee', trackingNumber: null, quantity: 1, unitPrice: 2000, amount: 2000 },
      { id: 'li7', description: 'Delivery — Marina to Apapa', trackingNumber: 'CRD-MK0000022', quantity: 1, unitPrice: 3000, amount: 3000 },
      { id: 'li8', description: 'Same-day express surcharge', trackingNumber: null, quantity: 3, unitPrice: 2000, amount: 6000 },
      { id: 'li9', description: 'Miscellaneous deliveries (Oct batch)', trackingNumber: null, quantity: 6, unitPrice: 1000, amount: 6000 },
    ],
    subtotal: 45000, vatRate: 0, vatAmount: 0,
  },
  'get /invoices/inv2': {
    id: 'inv2', invoiceNumber: 'INV-2026-002', status: 'PAID',
    customer: { id: 'c2', name: 'XYZ Ltd', email: 'accounts@xyzltd.com', phone: '+2348009876543', address: '22 Victoria Island, Lagos' },
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    paidAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    totalAmount: 35000, paidAmount: 35000,
    bankName: 'First Bank Nigeria', accountNumber: '3012345678', accountName: 'City Riders Logistics Ltd',
    notes: 'Thank you for your payment.',
    lineItems: [
      { id: 'li10', description: 'Monthly delivery contract — October', trackingNumber: null, quantity: 14, unitPrice: 2500, amount: 35000 },
    ],
    subtotal: 35000, vatRate: 0, vatAmount: 0,
  },
  'get /invoices/inv3': {
    id: 'inv3', invoiceNumber: 'INV-2026-003', status: 'OVERDUE',
    customer: { id: 'c3', name: 'Demo Sender', email: 'demo@example.com', phone: '+2348005555555', address: '7 Rumuola Rd, Port Harcourt' },
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    dueDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    totalAmount: 22500, paidAmount: 0,
    bankName: 'First Bank Nigeria', accountNumber: '3012345678', accountName: 'City Riders Logistics Ltd',
    notes: 'OVERDUE: Please remit payment immediately to avoid service suspension.',
    lineItems: [
      { id: 'li11', description: 'Delivery services — October', trackingNumber: null, quantity: 9, unitPrice: 2500, amount: 22500 },
    ],
    subtotal: 22500, vatRate: 0, vatAmount: 0,
  },
  'get /invoices/inv4': {
    id: 'inv4', invoiceNumber: 'INV-2026-004', status: 'PAID',
    customer: { id: 'c4', name: 'Tech Solutions', email: 'finance@techsolutions.ng', phone: '+2348007654321', address: '5 Lekki Phase 1, Lagos' },
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 15).toISOString(),
    paidAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    totalAmount: 17500, paidAmount: 17500,
    bankName: 'First Bank Nigeria', accountNumber: '3012345678', accountName: 'City Riders Logistics Ltd',
    notes: 'Thank you for your prompt payment.',
    lineItems: [
      { id: 'li12', description: 'Laptop delivery — Ikeja to Lekki', trackingNumber: 'CRD-MK0000031', quantity: 1, unitPrice: 6000, amount: 6000 },
      { id: 'li13', description: 'Office supplies delivery', trackingNumber: 'CRD-MK0000032', quantity: 1, unitPrice: 4500, amount: 4500 },
      { id: 'li14', description: 'Returns handling fee', trackingNumber: null, quantity: 1, unitPrice: 2000, amount: 2000 },
      { id: 'li15', description: 'Fuel surcharge (Oct)', trackingNumber: null, quantity: 5, unitPrice: 1000, amount: 5000 },
    ],
    subtotal: 17500, vatRate: 0, vatAmount: 0,
  },
  'get /invoices/inv5': {
    id: 'inv5', invoiceNumber: 'INV-2026-005', status: 'DRAFT',
    customer: { id: 'c5', name: 'City Mart', email: 'procurement@citymart.ng', phone: '+2348003210987', address: '3 Ojuelegba Rd, Surulere, Lagos' },
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 20).toISOString(),
    totalAmount: 12500, paidAmount: 0,
    bankName: 'First Bank Nigeria', accountNumber: '3012345678', accountName: 'City Riders Logistics Ltd',
    notes: 'Draft — pending review before sending to customer.',
    lineItems: [
      { id: 'li16', description: 'Grocery deliveries — Nov batch', trackingNumber: null, quantity: 5, unitPrice: 2500, amount: 12500 },
    ],
    subtotal: 12500, vatRate: 0, vatAmount: 0,
  },

  // -- Proof of payment uploads (keyed by invoice id) --------------------------
  'get /invoices/inv1/payment-proof': [],
  'get /invoices/inv2/payment-proof': [
    { id: 'pp1', filename: 'transfer_receipt_nov.pdf', uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(), uploadedBy: 'Admin' },
  ],
  'get /invoices/inv3/payment-proof': [],
  'get /invoices/inv4/payment-proof': [
    { id: 'pp2', filename: 'payment_confirmation.jpg', uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(), uploadedBy: 'Admin' },
  ],
  'get /invoices/inv5/payment-proof': [],

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
      { method: 'Bank Transfer', amount: 76000 },
      { method: 'Card', amount: 44000 },
      { method: 'Credit', amount: 10000 },
    ],
    total: 272000,
  },
  'get /reports/rider-performance': [
    { riderName: 'Emeka Obi',   deliveries: 32, successRate: 94, earnings: 32000 },
    { riderName: 'Fatima Musa', deliveries: 28, successRate: 89, earnings: 28000 },
    { riderName: 'Chidi Nkem',  deliveries: 15, successRate: 80, earnings: 15000 },
    { riderName: 'Amaka Eze',   deliveries: 12, successRate: 75, earnings: 12000 },
  ],
  'get /reports/sla-breach': {
    breachRate: 23,
    totalPackages: 94,
    breachedPackages: 22,
    avgDeliveryHours: 4.2,
    slaHours: 4,
    byZone: [
      { zone: 'Lagos Island',    total: 25, breached: 4,  breachRate: 16 },
      { zone: 'Victoria Island', total: 20, breached: 5,  breachRate: 25 },
      { zone: 'Lekki',          total: 18, breached: 7,  breachRate: 39 },
      { zone: 'Ikeja',          total: 16, breached: 4,  breachRate: 25 },
      { zone: 'Yaba',           total: 15, breached: 2,  breachRate: 13 },
    ],
    byDay: [
      { date: '11/15', delivered: 10, breached: 2 },
      { date: '11/16', delivered: 15, breached: 4 },
      { date: '11/17', delivered: 14, breached: 3 },
      { date: '11/18', delivered: 13, breached: 2 },
      { date: '11/19', delivered: 12, breached: 1 },
      { date: '11/20', delivered: 15, breached: 4 },
      { date: '11/21', delivered: 15, breached: 6 },
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
      { zone: 'Lagos Island',    revenue: 85000, shipments: 36, deliveries: 32, avgFee: 2656, successRate: 89 },
      { zone: 'Victoria Island', revenue: 72000, shipments: 29, deliveries: 25, avgFee: 2880, successRate: 86 },
      { zone: 'Lekki',          revenue: 65000, shipments: 25, deliveries: 20, avgFee: 3250, successRate: 80 },
      { zone: 'Ikeja',           revenue: 32000, shipments: 14, deliveries: 11, avgFee: 2909, successRate: 79 },
      { zone: 'Yaba',            revenue: 18000, shipments: 8,  deliveries: 6,  avgFee: 3000, successRate: 75 },
    ],
  },
  'get /reports/route-performance': [
    { routeId: 'z1', route: 'Lagos Island', packages: 34, delivered: 29, unsuccessful: 3, pending: 2, completionRate: 85 },
    { routeId: 'z2', route: 'Victoria Island', packages: 26, delivered: 22, unsuccessful: 2, pending: 2, completionRate: 85 },
    { routeId: 'z3', route: 'Lekki', packages: 21, delivered: 16, unsuccessful: 3, pending: 2, completionRate: 76 },
    { routeId: 'z4', route: 'Ikeja', packages: 18, delivered: 15, unsuccessful: 1, pending: 2, completionRate: 83 },
  ],
  'get /reports/delivery-exceptions': [
    {
      trackingNumber: 'CRD-MK0000005', orderReference: 'ORD-105', status: 'DELIVERY_ATTEMPTED',
      updatedAt: new Date(Date.now() - 86400000).toISOString(), reattemptAt: new Date(Date.now() + 86400000).toISOString(),
      sender: { name: 'Alice Corp' }, recipient: { name: 'Jane Doe' },
      statusHistory: [{ note: 'Recipient unavailable at the delivery address', failedReason: 'RECIPIENT_NOT_AVAILABLE', failureReasonCode: { label: 'Recipient not available' }, createdAt: new Date(Date.now() - 86400000).toISOString() }],
    },
    {
      trackingNumber: 'CRD-MK0000008', orderReference: 'ORD-108', status: 'FAILED',
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(), reattemptAt: null,
      sender: { name: 'Tech Solutions' }, recipient: { name: 'Emeka Chi' },
      statusHistory: [{ note: 'Address could not be located', failedReason: 'INVALID_ADDRESS', failureReasonCode: { label: 'Invalid address' }, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() }],
    },
  ],
  'get /reports/invoice-aging': [
    { invoiceNumber: 'INV-2026-014', customer: 'Alice Corp', dueDate: new Date(Date.now() - 18 * 86400000).toISOString(), daysOverdue: 18, bucket: '1-30', total: 45000, balance: 15000, status: 'PARTIALLY_PAID' },
    { invoiceNumber: 'INV-2026-009', customer: 'XYZ Ltd', dueDate: new Date(Date.now() - 47 * 86400000).toISOString(), daysOverdue: 47, bucket: '31-60', total: 82000, balance: 82000, status: 'OVERDUE' },
    { invoiceNumber: 'INV-2026-003', customer: 'City Mart', dueDate: new Date(Date.now() - 96 * 86400000).toISOString(), daysOverdue: 96, bucket: '90+', total: 127500, balance: 62500, status: 'DISPUTED' },
  ],
  'get /reports/customer-service-activity': {
    interactions: [
      { id: 'int-demo-1', customer: { name: 'Alice Corp' }, package: { trackingNumber: 'CRD-MK0000005' }, staff: { firstName: 'Jane', lastName: 'Staff' }, channel: 'PHONE', summary: 'Customer requested a delivery update', actionTaken: 'Confirmed the next delivery attempt with the rider', outcome: 'RESOLVED', createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'int-demo-2', customer: { name: 'XYZ Ltd' }, package: { trackingNumber: 'CRD-MK0000008' }, staff: { firstName: 'David', lastName: 'Support' }, channel: 'EMAIL', summary: 'Customer asked us to verify the delivery address', actionTaken: 'Sent an address confirmation request', outcome: 'FOLLOW_UP_REQUIRED', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    ],
    escalations: [
      { id: 'esc-demo-1', customer: { name: 'Tech Solutions' }, package: { trackingNumber: 'CRD-MK0000008' }, priority: 'HIGH', status: 'OPEN', reason: 'Delivery attempt failed twice', requestedAction: 'Confirm the package location and arrange a new attempt', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    ],
  },
  'get /reports/maintenance-history': [
    { id: 'maint-demo-1', vehicle: { plateNumber: 'LAG-482-KD', make: 'Toyota', model: 'Hiace' }, type: 'SCHEDULED_SERVICE', description: 'Routine engine service and oil change', serviceDate: new Date(Date.now() - 3 * 86400000).toISOString(), cost: 85000, status: 'COMPLETED', performedBy: 'City Mechanics' },
    { id: 'maint-demo-2', vehicle: { plateNumber: 'LAG-219-TR', make: 'Honda', model: 'Ace' }, type: 'REPAIR', description: 'Replaced rear brake pads', serviceDate: new Date(Date.now() - 9 * 86400000).toISOString(), cost: 32000, status: 'COMPLETED', performedBy: 'Ikeja Auto Works' },
    { id: 'maint-demo-3', vehicle: { plateNumber: 'LAG-771-MN', make: 'Suzuki', model: 'APV' }, type: 'INSPECTION', description: 'Quarterly safety inspection', serviceDate: new Date(Date.now() - 16 * 86400000).toISOString(), cost: 12000, status: 'COMPLETED', performedBy: 'Fleet Workshop' },
  ],
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
  'get /customer-service/followups': [
    { id: 'p1', trackingNumber: 'CRD-MK0000001', status: 'DELIVERY_ATTEMPTED', destCity: 'Lagos', followupDue: new Date(Date.now() + 3600000 * 2).toISOString(), recipient: { name: 'Bob Smith', phone: '+2348009876543' }, lastInteraction: 'Promised re-delivery tomorrow' },
  ],
  'get /customer-service/escalations': [
    { id: 'e1', priority: 'HIGH', status: 'OPEN', reason: 'Package stuck in transit for 3 days', requestedAction: 'Contact rider and investigate', createdAt: new Date(Date.now() - 86400000).toISOString(), raisedBy: { firstName: 'Jane', lastName: 'Staff' }, package: { trackingNumber: 'CRD-MK0000001', status: 'IN_TRANSIT', destCity: 'Lagos' }, customer: { name: 'Alice Corp', phone: '+2348001234567' } },
    { id: 'e2', priority: 'URGENT', status: 'IN_PROGRESS', reason: 'Recipient claims package was damaged', requestedAction: 'Issue refund or replacement', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), raisedBy: { firstName: 'Jane', lastName: 'Staff' }, package: { trackingNumber: 'CRD-MK0000003', status: 'DELIVERED', destCity: 'Port Harcourt' }, customer: { name: 'Beta Ltd', phone: '+2348012345678' } },
  ],

  // -- Receipt Reconciliation ---------------------------------------------------
  'get /packages/reconciliation/pending': {
    data: [
      { id: 'p3', trackingNumber: 'CRD-MK0000003', updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(), sender: { name: 'Demo Sender' }, recipient: { name: 'Test User', address: '1 Aba Road, Port Harcourt' }, assignments: [{ rider: { user: { firstName: 'Fatima', lastName: 'Musa' } } }] },
    ],
    meta: { total: 1 },
  },

  // -- Pickup Locations (keyed by customerId) ------------------------------------
  'get /pickup-locations/c1': [
    { id: 'pl1', label: 'Head Office', address: '15 Broad Street', city: 'Lagos Island', state: 'Lagos', instructions: 'Ask for the logistics desk', isDefault: true },
    { id: 'pl2', label: 'Warehouse', address: '7 Apapa Road', city: 'Apapa', state: 'Lagos', instructions: 'Gate 2, ring bell', isDefault: false },
  ],
  'get /pickup-locations/c2': [
    { id: 'pl3', label: 'XYZ Main Office', address: '22 Victoria Island', city: 'Lagos', state: 'Lagos', instructions: null, isDefault: true },
  ],
  'get /pickup-locations/c3': [],
  'get /pickup-locations/c4': [
    { id: 'pl4', label: 'Tech Hub', address: '5 Lekki Phase 1', city: 'Lekki', state: 'Lagos', instructions: 'Office on 3rd floor', isDefault: true },
  ],
  'get /pickup-locations/c5': [],

  // -- Company Employees (Payroll) -----------------------------------------------
  // -- Vehicles -----------------------------------------------------------------
  'get /vehicles': [
    { id: 'v1', plateNumber: 'LG-401-MK', make: 'Honda',  model: 'CG125',  year: 2021, type: 'Motorcycle', status: 'ACTIVE',      odometerKm: 24500, insuranceExpiry: '2027-03-15', inspectionExpiry: '2027-01-20', assignedRiderId: 'r1', assignedRider: { id: 'r1', user: { firstName: 'Emeka',  lastName: 'Obi'  } }, notes: 'Well maintained' },
    { id: 'v2', plateNumber: 'LG-702-YB', make: 'Suzuki', model: 'GN125',  year: 2020, type: 'Motorcycle', status: 'ACTIVE',      odometerKm: 31200, insuranceExpiry: '2026-11-30', inspectionExpiry: '2026-12-15', assignedRiderId: 'r2', assignedRider: { id: 'r2', user: { firstName: 'Fatima', lastName: 'Musa' } }, notes: '' },
    { id: 'v3', plateNumber: 'LG-105-XY', make: 'Bajaj',  model: 'Boxer',  year: 2022, type: 'Motorcycle', status: 'MAINTENANCE', odometerKm: 18700, insuranceExpiry: '2027-06-10', inspectionExpiry: '2027-02-28', assignedRiderId: '',   assignedRider: null, notes: 'Clutch replacement in progress' },
    { id: 'v4', plateNumber: 'LG-830-FT', make: 'Toyota', model: 'Hiace',  year: 2019, type: 'Van',        status: 'ACTIVE',      odometerKm: 87400, insuranceExpiry: '2027-02-20', inspectionExpiry: '2026-12-01', assignedRiderId: '',   assignedRider: null, notes: 'Used for bulk deliveries' },
    { id: 'v5', plateNumber: 'LG-220-QA', make: 'TVS',    model: 'Apache', year: 2023, type: 'Motorcycle', status: 'INACTIVE',    odometerKm: 5200,  insuranceExpiry: '2026-08-15', inspectionExpiry: '2026-09-30', assignedRiderId: '',   assignedRider: null, notes: 'Insurance lapsed — pending renewal' },
  ],

  // -- Maintenance --------------------------------------------------------------
  'get /maintenance': [
    { id: 'm1', vehicleId: 'v1', vehicle: { id: 'v1', plateNumber: 'LG-401-MK', make: 'Honda',  model: 'CG125'  }, type: 'Oil Change',    description: 'Engine oil and filter changed',          cost: 8500,  mileageAtService: 24000, serviceDate: '2026-11-01', nextServiceDate: '2027-01-01', nextServiceMileage: 27000, performedBy: 'Kunle Mechanics',         status: 'COMPLETED',   notes: '' },
    { id: 'm2', vehicleId: 'v2', vehicle: { id: 'v2', plateNumber: 'LG-702-YB', make: 'Suzuki', model: 'GN125'  }, type: 'Tire Replacement', description: 'Both tyres replaced',                   cost: 22000, mileageAtService: 30800, serviceDate: '2026-10-15', nextServiceDate: '2026-12-15', nextServiceMileage: 36000, performedBy: 'City Tyres Ltd',          status: 'COMPLETED',   notes: 'Rear tyre had a split sidewall' },
    { id: 'm3', vehicleId: 'v3', vehicle: { id: 'v3', plateNumber: 'LG-105-XY', make: 'Bajaj',  model: 'Boxer'  }, type: 'Engine Repair',  description: 'Clutch plate and cable replacement',    cost: 35000, mileageAtService: 18700, serviceDate: '2026-11-18', nextServiceDate: '2027-02-18', nextServiceMileage: 22000, performedBy: 'Femi Auto Repairs',       status: 'IN_PROGRESS', notes: 'Waiting for clutch plate part' },
    { id: 'm4', vehicleId: 'v4', vehicle: { id: 'v4', plateNumber: 'LG-830-FT', make: 'Toyota', model: 'Hiace'  }, type: 'Inspection',     description: 'Annual road-worthiness inspection',     cost: 15000, mileageAtService: 87000, serviceDate: '2026-11-10', nextServiceDate: '2026-12-01', nextServiceMileage: 90000, performedBy: 'FRSC Approved Centre',    status: 'COMPLETED',   notes: '' },
    { id: 'm5', vehicleId: 'v1', vehicle: { id: 'v1', plateNumber: 'LG-401-MK', make: 'Honda',  model: 'CG125'  }, type: 'Brake Service',  description: 'Front and rear brake pads replaced',    cost: 12500, mileageAtService: 23500, serviceDate: '2026-10-05', nextServiceDate: '2027-01-20', nextServiceMileage: 27000, performedBy: 'Kunle Mechanics',         status: 'COMPLETED',   notes: '' },
    { id: 'm6', vehicleId: 'v2', vehicle: { id: 'v2', plateNumber: 'LG-702-YB', make: 'Suzuki', model: 'GN125'  }, type: 'Air Filter',     description: 'Air filter cleaned and replaced',       cost: 4500,  mileageAtService: 31000, serviceDate: '2026-11-05', nextServiceDate: '2026-12-20', nextServiceMileage: 34000, performedBy: 'Kunle Mechanics',         status: 'SCHEDULED',   notes: '' },
  ],

  // -- Company Employees (Payroll) -----------------------------------------------
  'get /employees': [
    { id: 'emp1', name: 'Adaeze Okafor',       role: 'MANAGER',          department: 'Operations', employmentType: 'STAFF',  basicSalary: 350000, housingAllowance: 100000, transportAllowance: 50000, email: 'adaeze@cityrider.com',    phone: '+2348041111111', pensionPin: 'PEN100001234', bankName: 'First Bank Nigeria', accountNumber: '3012345670', accountHolderName: 'Adaeze Okafor', additions: [] },
    { id: 'emp2', name: 'Chukwuemeka Nwosu',   role: 'ACCOUNTANT',       department: 'Finance',    employmentType: 'STAFF',  basicSalary: 280000, housingAllowance: 80000,  transportAllowance: 40000, email: 'emeka@cityrider.com',     phone: '+2348042222222', pensionPin: 'PEN100001235', bankName: 'GTBank',           accountNumber: '0123456781', accountHolderName: 'Chukwuemeka Nwosu', additions: [] },
    { id: 'emp3', name: 'Fatima Aliyu',         role: 'DISPATCHER',       department: 'Operations', employmentType: 'STAFF',  basicSalary: 220000, housingAllowance: 60000,  transportAllowance: 35000, email: 'fatima.a@cityrider.com',  phone: '+2348043333333', pensionPin: 'PEN100001236', bankName: 'Zenith Bank',      accountNumber: '2012345678', accountHolderName: 'Fatima Aliyu', additions: [] },
    { id: 'emp4', name: 'Obinna Chukwu',        role: 'CUSTOMER_SERVICE', department: 'Support',    employmentType: 'STAFF',  basicSalary: 180000, housingAllowance: 50000,  transportAllowance: 30000, email: 'obinna@cityrider.com',    phone: '+2348044444444', pensionPin: 'PEN100001237', bankName: 'Access Bank',      accountNumber: '0987654321', accountHolderName: 'Obinna Chukwu', additions: [] },
    { id: 'emp-r1', riderId: 'r1', name: 'Emeka Obi',   role: 'RIDER', department: 'Delivery', employmentType: 'RIDER', basicSalary: 0, housingAllowance: 0, transportAllowance: 0, ratePerDelivery: 5000, email: 'emeka.obi@cityrider.com',   phone: '+2348031111111', pensionPin: 'PEN100001238', bankName: 'First Bank Nigeria', accountNumber: '3098765432', accountHolderName: 'Emeka Obi', additions: [] },
    { id: 'emp-r2', riderId: 'r2', name: 'Fatima Musa', role: 'RIDER', department: 'Delivery', employmentType: 'RIDER', basicSalary: 0, housingAllowance: 0, transportAllowance: 0, ratePerDelivery: 5000, email: 'fatima.musa@cityrider.com', phone: '+2348032222222', pensionPin: 'PEN100001239', bankName: 'UBA',              accountNumber: '2234567890', accountHolderName: 'Fatima Musa', additions: [] },
  ],
};

function isMock() {
  return typeof window !== 'undefined' && localStorage.getItem('cr_mock_mode') === '1';
}

// Restore persisted mock mutations from a previous session
if (typeof window !== 'undefined') {
  try {
    const saved = JSON.parse(localStorage.getItem('cr_mock_db') ?? 'null');
    if (saved && typeof saved === 'object') {
      for (const k of Object.keys(saved)) {
        MOCK_DB[k] = saved[k];
      }
    }
  } catch {}
}

function saveMockDb() {
  try { localStorage.setItem('cr_mock_db', JSON.stringify(MOCK_DB)); } catch {}
}

const MOCK_STATUS_OVERRIDES: Record<string, string> = {};

function uid() { return Math.random().toString(36).slice(2, 9); }

function _annualPAYE(annualTaxable: number): number {
  const brackets: [number, number][] = [[300000, 0.07],[300000, 0.11],[500000, 0.15],[500000, 0.19],[1600000, 0.21],[Infinity, 0.24]];
  let tax = 0, rem = Math.max(annualTaxable, 0);
  for (const [limit, rate] of brackets) { if (rem <= 0) break; const c = Math.min(rem, limit); tax += c * rate; rem -= c; }
  return Math.round(tax);
}

function _computePayroll(emp: any, deliveries?: number) {
  const isRider = emp.employmentType === 'RIDER';
  const basic    = isRider ? (deliveries ?? 0) * (emp.ratePerDelivery ?? 5000) : (emp.basicSalary ?? 0);
  const housing  = isRider ? 0 : (emp.housingAllowance ?? 0);
  const transport = isRider ? 0 : (emp.transportAllowance ?? 0);
  const bonus    = emp.bonus ?? 0;
  const additionsTotal = Array.isArray(emp.additions) ? emp.additions.reduce((s: number, a: any) => s + (a.amount ?? 0), 0) : 0;
  const grossPay = basic + housing + transport + bonus + additionsTotal;
  const pension  = Math.round((basic + housing + transport) * 0.08);
  const nhf      = Math.round(basic * 0.025);
  const annualGross = grossPay * 12;
  const cra = Math.max(annualGross * 0.01, 200000) + annualGross * 0.20;
  const annualTaxable = Math.max(annualGross - pension * 12 - nhf * 12 - cra, 0);
  const taxPAYE = Math.round(_annualPAYE(annualTaxable) / 12);
  const netPay  = Math.max(grossPay - pension - nhf - taxPAYE, 0);
  return { basicPay: basic, housingAllowance: housing, transportAllowance: transport, bonus, additions: emp.additions ?? [], additionsTotal, grossPay, pension, nhf, taxPAYE, netPay };
}

function mockAdapter(config: any): Promise<any> {
  const method = (config.method ?? 'get').toLowerCase();
  const path = (config.url ?? '').split('?')[0];
  const key = `${method} ${path}`;
  const body = (() => { try { return typeof config.data === 'string' ? JSON.parse(config.data) : (config.data ?? {}); } catch { return {}; } })();
  const ok = (data: any = { ok: true }) => { if (method !== 'get') saveMockDb(); return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config, request: {} }); };
  const created = (data: any) => { saveMockDb(); return Promise.resolve({ data, status: 201, statusText: 'Created', headers: {}, config, request: {} }); };

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

  // Customer Pickup Locations
  if (method === 'get' && /^\/customers\/[^/]+\/pickup-locations$/.test(path)) {
    const cId = path.split('/')[2];
    return ok((MOCK_DB[`get /pickup-locations/${cId}`] as any[]) ?? []);
  }
  if (method === 'post' && /^\/customers\/[^/]+\/pickup-locations$/.test(path)) {
    const cId = path.split('/')[2];
    const key = `get /pickup-locations/${cId}`;
    if (!MOCK_DB[key]) MOCK_DB[key] = [];
    const newLoc = { id: 'pl' + uid(), ...body };
    if (body.isDefault) {
      (MOCK_DB[key] as any[]).forEach((l: any) => { l.isDefault = false; });
    }
    (MOCK_DB[key] as any[]).push(newLoc);
    return created(newLoc);
  }
  if (method === 'patch' && /^\/customers\/[^/]+\/pickup-locations\/[^/]+$/.test(path)) {
    const parts = path.split('/');
    const cId = parts[2];
    const locId = parts[4];
    const key = `get /pickup-locations/${cId}`;
    const list = (MOCK_DB[key] as any[]) ?? [];
    const item = list.find((l: any) => l.id === locId);
    if (item) {
      if (body.isDefault) list.forEach((l: any) => { l.isDefault = false; });
      Object.assign(item, body);
    }
    return ok(item ?? {});
  }
  if (method === 'delete' && /^\/customers\/[^/]+\/pickup-locations\/[^/]+$/.test(path)) {
    const parts = path.split('/');
    const cId = parts[2];
    const locId = parts[4];
    const key = `get /pickup-locations/${cId}`;
    const list = (MOCK_DB[key] as any[]) ?? [];
    const idx = list.findIndex((l: any) => l.id === locId);
    if (idx !== -1) list.splice(idx, 1);
    return ok();
  }

  // Riders
  if (method === 'post' && path === '/riders') {
    const r = { id: 'r' + uid(), status: 'ACTIVE', vehicleType: body.vehicleType ?? null, vehiclePlate: body.vehiclePlate ?? null, createdAt: new Date().toISOString(), user: { firstName: body.firstName ?? '', lastName: body.lastName ?? '', email: body.email ?? '', phone: body.phone ?? null } };
    (MOCK_DB['get /riders'] as any[]).push(r);
    (MOCK_DB['get /riders/active'] as any[]).push(r);
    (MOCK_DB as any)['get /riders/' + r.id] = r;
    (MOCK_DB as any)['get /riders/' + r.id + '/deliveries'] = [];
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

  // Invoice detail GET (individual invoice with line items)
  if (method === 'get' && /^\/invoices\/[^/]+$/.test(path) && !path.includes('payment-proof')) {
    const invId = path.split('/')[2];
    return ok(MOCK_DB[`get /invoices/${invId}`] ?? null);
  }

  // Payment proof GET
  if (method === 'get' && /^\/invoices\/[^/]+\/payment-proof$/.test(path)) {
    const invId = path.split('/')[2];
    const key = `get /invoices/${invId}/payment-proof`;
    return ok((MOCK_DB[key] as any[]) ?? []);
  }

  // Payment proof POST (upload)
  if (method === 'post' && /^\/invoices\/[^/]+\/payment-proof$/.test(path)) {
    const invId = path.split('/')[2];
    const key = `get /invoices/${invId}/payment-proof`;
    if (!MOCK_DB[key]) (MOCK_DB as any)[key] = [];
    const entry = { id: 'pp' + uid(), filename: body.filename ?? 'proof.jpg', uploadedAt: new Date().toISOString(), uploadedBy: 'Admin' };
    (MOCK_DB[key] as any[]).push(entry);
    return created(entry);
  }

  // Invoice status actions (void / dispute / mark sent)
  if (method === 'patch' && /^\/invoices\/[^/]+$/.test(path)) {
    const invId = path.split('/')[2];
    const list = MOCK_DB['get /invoices'] as any[];
    const item = list.find((i: any) => i.id === invId);
    if (item) Object.assign(item, body);
    return ok(item ?? {});
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
    (MOCK_DB as any)['get /packages/' + id] = { ...p, statusHistory: [{ id: 'sh-' + id, status: 'AWAITING_ASSIGNMENT', note: 'Package registered', createdAt: p.createdAt }] };
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

  // Reconciliation
  if (method === 'patch' && /^\/packages\/[^/]+\/reconcile$/.test(path)) {
    const pkgId = path.split('/')[2];
    const rec = MOCK_DB['get /packages/reconciliation/pending'] as any;
    if (rec?.data) {
      const idx = rec.data.findIndex((p: any) => p.id === pkgId);
      if (idx !== -1) { rec.data.splice(idx, 1); rec.meta.total = Math.max(0, rec.meta.total - 1); }
    }
    return ok({ ok: true });
  }

  // Settlements
  if (method === 'post' && path === '/payments/settle') {
    const payments = MOCK_DB['get /payments'] as any[];
    if (Array.isArray(payments)) {
      payments.forEach((p: any) => { if (p.status === 'Pending') p.status = 'Paid'; });
    }
    return ok({ ok: true, settled: payments?.filter((p: any) => p.status === 'Paid').length ?? 0 });
  }

  // Customer Service: customer summary and packages
  if (method === 'get' && /^\/customer-service\/customers\/[^/]+\/summary$/.test(path)) {
    const customerId = path.split('/')[3];
    const allPkgs = (MOCK_DB['get /packages'] as any).data as any[];
    const customerPkgs = allPkgs.filter((p: any) => p.senderId === customerId || p.customerId === customerId);
    return ok({ totalPackages: customerPkgs.length, delivered: customerPkgs.filter((p: any) => p.status === 'DELIVERED').length, inTransit: customerPkgs.filter((p: any) => p.status === 'IN_TRANSIT').length, failed: customerPkgs.filter((p: any) => p.status === 'FAILED' || p.status === 'RETURNED').length });
  }
  if (method === 'get' && /^\/customer-service\/customers\/[^/]+\/packages$/.test(path)) {
    const customerId = path.split('/')[3];
    const allPkgs = (MOCK_DB['get /packages'] as any).data as any[];
    return ok(allPkgs.filter((p: any) => p.senderId === customerId || p.customerId === customerId));
  }

  // Vehicles CRUD
  if (method === 'get' && path === '/vehicles') {
    let list = [...(MOCK_DB['get /vehicles'] as any[])];
    const q = (config.params?.search ?? '').toLowerCase();
    if (q) list = list.filter((v: any) => (v.plateNumber + v.make + v.model).toLowerCase().includes(q));
    return ok(list);
  }
  if (method === 'post' && path === '/vehicles') {
    const riders = MOCK_DB['get /riders'] as any[];
    const rider = body.assignedRiderId ? riders.find((r: any) => r.id === body.assignedRiderId) : null;
    const v = { id: 'v' + uid(), ...body, assignedRider: rider ? { id: rider.id, user: rider.user } : null };
    (MOCK_DB['get /vehicles'] as any[]).push(v);
    saveMockDb(); return created(v);
  }
  if (method === 'patch' && /^\/vehicles\/[^/]+$/.test(path)) {
    const list = MOCK_DB['get /vehicles'] as any[];
    const item = list.find((v: any) => v.id === path.split('/')[2]);
    if (item) {
      Object.assign(item, body);
      if (body.assignedRiderId !== undefined) {
        const riders = MOCK_DB['get /riders'] as any[];
        const rider = body.assignedRiderId ? riders.find((r: any) => r.id === body.assignedRiderId) : null;
        item.assignedRider = rider ? { id: rider.id, user: rider.user } : null;
      }
      saveMockDb();
    }
    return ok(item ?? {});
  }
  if (method === 'delete' && /^\/vehicles\/[^/]+$/.test(path)) {
    const list = MOCK_DB['get /vehicles'] as any[];
    const idx = list.findIndex((v: any) => v.id === path.split('/')[2]);
    if (idx !== -1) list.splice(idx, 1);
    saveMockDb(); return ok();
  }

  // Maintenance CRUD
  if (method === 'get' && path === '/maintenance/alerts') {
    const soon = new Date(); soon.setDate(soon.getDate() + 30);
    const list = (MOCK_DB['get /maintenance'] as any[]).filter((r: any) => r.nextServiceDate && new Date(r.nextServiceDate) <= soon && r.status !== 'CANCELLED');
    return ok(list);
  }
  if (method === 'get' && path === '/maintenance') {
    let list = [...(MOCK_DB['get /maintenance'] as any[])];
    if (config.params?.vehicleId) list = list.filter((r: any) => r.vehicleId === config.params.vehicleId);
    return ok(list);
  }
  if (method === 'post' && path === '/maintenance') {
    const vehicles = MOCK_DB['get /vehicles'] as any[];
    const vehicle = vehicles.find((v: any) => v.id === body.vehicleId);
    const r = { id: 'm' + uid(), ...body, cost: body.cost ? Number(body.cost) : null, mileageAtService: body.mileageAtService ? Number(body.mileageAtService) : null, nextServiceMileage: body.nextServiceMileage ? Number(body.nextServiceMileage) : null, vehicle: vehicle ? { id: vehicle.id, plateNumber: vehicle.plateNumber, make: vehicle.make, model: vehicle.model } : null };
    (MOCK_DB['get /maintenance'] as any[]).push(r);
    saveMockDb(); return created(r);
  }
  if (method === 'patch' && /^\/maintenance\/[^/]+$/.test(path)) {
    const list = MOCK_DB['get /maintenance'] as any[];
    const item = list.find((r: any) => r.id === path.split('/')[2]);
    if (item) { Object.assign(item, body); saveMockDb(); }
    return ok(item ?? {});
  }
  if (method === 'delete' && /^\/maintenance\/[^/]+$/.test(path)) {
    const list = MOCK_DB['get /maintenance'] as any[];
    const idx = list.findIndex((r: any) => r.id === path.split('/')[2]);
    if (idx !== -1) list.splice(idx, 1);
    saveMockDb(); return ok();
  }

  // Employees CRUD
  if (method === 'post' && path === '/employees') {
    const emp = { id: 'emp' + uid(), ...body };
    (MOCK_DB['get /employees'] as any[]).push(emp);
    saveMockDb(); return created(emp);
  }
  if (method === 'patch' && /^\/employees\/[^/]+$/.test(path)) {
    const list = MOCK_DB['get /employees'] as any[];
    const item = list.find((e: any) => e.id === path.split('/')[2]);
    if (item) { Object.assign(item, body); saveMockDb(); }
    return ok(item ?? {});
  }
  if (method === 'delete' && /^\/employees\/[^/]+$/.test(path)) {
    const list = MOCK_DB['get /employees'] as any[];
    const idx = list.findIndex((e: any) => e.id === path.split('/')[2]);
    if (idx !== -1) list.splice(idx, 1);
    saveMockDb(); return ok();
  }

  // Payroll (company-wide)
  if (method === 'get' && path === '/employees') {
    return ok(MOCK_DB['get /employees'] as any[]);
  }
  if (method === 'get' && path === '/payroll') {
    const period = config.params?.period ?? new Date().toISOString().slice(0, 7);
    const runs: any[] = ((MOCK_DB['payroll-runs'] as any) ?? {})[period] ?? [];
    const totalGross   = runs.reduce((s: number, r: any) => s + r.grossPay, 0);
    const totalNet     = runs.reduce((s: number, r: any) => s + r.netPay, 0);
    const totalPAYE    = runs.reduce((s: number, r: any) => s + r.taxPAYE, 0);
    const totalPension = runs.reduce((s: number, r: any) => s + r.pension, 0);
    const paidOut      = runs.filter((r: any) => r.status === 'PAID').reduce((s: number, r: any) => s + r.netPay, 0);
    return ok({ period, summary: { totalGross, totalNet, totalPAYE, totalPension, paidOut, pending: totalNet - paidOut, employeeCount: runs.length }, records: runs });
  }
  if (method === 'post' && path === '/payroll/run') {
    const period = body.period ?? new Date().toISOString().slice(0, 7);
    const employees = MOCK_DB['get /employees'] as any[];
    const seed = period.replace('-', '');
    const seededInt = (base: number) => { let h = parseInt(seed, 10) % 97; return base + (h % 15); };
    const runs = employees.map((emp: any) => {
      const isRider = emp.employmentType === 'RIDER';
      const deliveries = isRider ? seededInt(20) : undefined;
      const calc = _computePayroll(emp, deliveries);
      return { id: 'pr-' + uid(), employeeId: emp.id, employeeName: emp.name, role: emp.role, department: emp.department, employmentType: emp.employmentType, deliveries: deliveries ?? null, ratePerDelivery: emp.ratePerDelivery ?? null, ...calc, status: 'PENDING', paidAt: null, bankName: emp.bankName, accountNumber: emp.accountNumber, accountHolderName: emp.accountHolderName ?? emp.name, pensionPin: emp.pensionPin };
    });
    if (!MOCK_DB['payroll-runs']) MOCK_DB['payroll-runs'] = {};
    (MOCK_DB['payroll-runs'] as any)[period] = runs;
    saveMockDb();
    return created({ period, records: runs });
  }
  if (method === 'patch' && /^\/payroll\/[^/]+\/pay$/.test(path)) {
    const prId = path.split('/')[2];
    for (const p of Object.values((MOCK_DB['payroll-runs'] as any) ?? {})) {
      const rec = (p as any[]).find((r: any) => r.id === prId);
      if (rec) { rec.status = 'PAID'; rec.paidAt = new Date().toISOString(); saveMockDb(); return ok(rec); }
    }
    return ok();
  }
  if (method === 'patch' && /^\/payroll\/[^/]+\/bonus$/.test(path)) {
    const prId = path.split('/')[2];
    for (const p of Object.values((MOCK_DB['payroll-runs'] as any) ?? {})) {
      const rec = (p as any[]).find((r: any) => r.id === prId);
      if (rec) {
        const emp = (MOCK_DB['get /employees'] as any[]).find((e: any) => e.id === rec.employeeId);
        if (emp) { const calc = _computePayroll({ ...emp, bonus: body.bonus ?? 0 }, rec.deliveries); Object.assign(rec, calc); }
        saveMockDb(); return ok(rec);
      }
    }
    return ok();
  }

  // Global search
  if (method === 'get' && path === '/search') {
    const q = (config.params?.q ?? '').toLowerCase().trim();
    if (!q) return ok({ packages: [], customers: [], riders: [] });
    const allCustomers = MOCK_DB['get /customers'] as any[];
    const allPackages = (MOCK_DB['get /packages'] as any).data as any[];
    const allRiders = MOCK_DB['get /riders'] as any[];
    const matchCustomers = allCustomers.filter((c: any) =>
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q)
    );
    const matchPackages = allPackages.filter((p: any) =>
      (p.trackingNumber ?? '').toLowerCase().includes(q) ||
      (p.sender?.name ?? '').toLowerCase().includes(q) ||
      (p.recipient?.name ?? '').toLowerCase().includes(q) ||
      (p.destCity ?? '').toLowerCase().includes(q)
    );
    const matchRiders = allRiders.filter((r: any) =>
      (r.user?.firstName ?? '').toLowerCase().includes(q) ||
      (r.user?.lastName ?? '').toLowerCase().includes(q) ||
      (`${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`).toLowerCase().includes(q) ||
      (r.user?.email ?? '').toLowerCase().includes(q) ||
      (r.vehiclePlate ?? '').toLowerCase().includes(q)
    );
    return ok({ packages: matchPackages, customers: matchCustomers, riders: matchRiders });
  }

  // Dynamic individual GET for packages (falls back to packages list when no MOCK_DB entry)
  const STATIC_PKG_PATHS = new Set(['stats', 'kanban', 'sla-alerts', 'reconciliation', 'bulk-status']);
  if (method === 'get' && /^\/packages\/[^/]+$/.test(path)) {
    const pkgId = path.split('/')[2];
    if (!STATIC_PKG_PATHS.has(pkgId)) {
      const existing = (MOCK_DB as any)[`get /packages/${pkgId}`];
      if (existing) return ok(existing);
      const all = (MOCK_DB['get /packages'] as any).data as any[];
      const pkg = all.find((p: any) => p.id === pkgId);
      return ok(pkg ?? null);
    }
  }

  // Dynamic individual GET for riders (falls back to riders list when no MOCK_DB entry)
  const STATIC_RIDER_PATHS = new Set(['stats', 'active', 'smart-dispatch']);
  if (method === 'get' && /^\/riders\/[^/]+$/.test(path)) {
    const riderId = path.split('/')[2];
    if (!STATIC_RIDER_PATHS.has(riderId)) {
      const existing = (MOCK_DB as any)[`get /riders/${riderId}`];
      if (existing) return ok(existing);
      const all = MOCK_DB['get /riders'] as any[];
      const rider = all.find((r: any) => r.id === riderId);
      return ok(rider ?? null);
    }
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
