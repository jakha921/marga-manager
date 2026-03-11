
import { Kitchen, Product, OperationEntry, DashboardStats, Category, Organization, User } from './types';

// --- SAAS DATA ---

export const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-1',
    name: 'Demo Restaurant Group',
    slug: 'demo-rest',
    plan: 'BASIC',
    status: 'ACTIVE',
    maxKitchens: 1,
    maxUsers: 5,
    createdAt: '2025-01-01',
    mrr: 49,
    contactName: 'Aziz Chef',
    phone: '+998 90 123 45 67',
    email: 'info@demorest.uz',
    address: 'Tashkent, Amir Temur 1',
    currency: 'UZS',
    taxRate: 12,
    lowStockThreshold: 10
  },
  {
    id: 'org-2',
    name: 'Oqtepa Lavash Franchise',
    slug: 'oqtepa-lavash',
    plan: 'PRO',
    status: 'ACTIVE',
    maxKitchens: 10,
    maxUsers: 50,
    createdAt: '2025-02-01',
    mrr: 199,
    contactName: 'Manager John',
    currency: 'UZS',
    taxRate: 12,
    lowStockThreshold: 50
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 'u-1',
    organizationId: 'org-1',
    username: 'admin',
    password: 'admin123',
    fullName: 'Aziz Chef',
    role: 'TENANT_ADMIN',
    createdAt: '2025-01-01'
  },
  {
    id: 'u-2',
    organizationId: 'org-2',
    username: 'oqtepa',
    password: 'admin123',
    fullName: 'Manager John',
    role: 'TENANT_ADMIN',
    createdAt: '2025-02-01'
  }
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Xom ashyo (Go\'sht/Sabzavot)', organizationId: 'org-1' },
  { id: 'c2', name: 'Baqqoliyot (Yog\'/Un)', organizationId: 'org-1' },
  { id: 'c3', name: 'Yarim tayyor', organizationId: 'org-1' },
  { id: 'c4', name: 'Ichimliklar', organizationId: 'org-1' },
  { id: 'c5', name: 'Tayyor Taomlar', organizationId: 'org-1' },
];

export const MOCK_KITCHENS: Kitchen[] = [
  {
    id: 'k1',
    name: 'Markaziy Oshxona',
    isActive: true,
    createdAt: '2025-01-01',
    organizationId: 'org-1'
  },
  {
    id: 'k2',
    name: 'Filial - Chilonzor',
    isActive: true,
    createdAt: '2025-01-15',
    organizationId: 'org-1'
  },
];

export const MOCK_PRODUCTS: Product[] = [
  // Raw Materials
  { id: 'p1', code: '1001', name: 'Mol go\'shti (Lahm)', category: 'Xom ashyo (Go\'sht/Sabzavot)', unit: 'kg', organizationId: 'org-1' },
  { id: 'p2', code: '1002', name: 'Qo\'y go\'shti', category: 'Xom ashyo (Go\'sht/Sabzavot)', unit: 'kg', organizationId: 'org-1' },
  { id: 'p3', code: '1003', name: 'Piyoz (Oq)', category: 'Xom ashyo (Go\'sht/Sabzavot)', unit: 'kg', organizationId: 'org-1' },
  { id: 'p4', code: '1004', name: 'Kartoshka', category: 'Xom ashyo (Go\'sht/Sabzavot)', unit: 'kg', organizationId: 'org-1' },
  
  // Grocery
  { id: 'p5', code: '2001', name: 'Kungaboqar yog\'i (1L)', category: 'Baqqoliyot (Yog\'/Un)', unit: 'L', organizationId: 'org-1' },
  { id: 'p6', code: '2002', name: 'Un (Oliy nav)', category: 'Baqqoliyot (Yog\'/Un)', unit: 'kg', organizationId: 'org-1' },
  { id: 'p7', code: '2003', name: 'Guruch (Lazer)', category: 'Baqqoliyot (Yog\'/Un)', unit: 'kg', organizationId: 'org-1' },
  
  // Semi-finished
  { id: 'p8', code: '3001', name: 'Somsa (Xamir)', category: 'Yarim tayyor', unit: 'kg', organizationId: 'org-1' },
  { id: 'p9', code: '3002', name: 'Kotlet (Muzlatilgan)', category: 'Yarim tayyor', unit: 'pcs', organizationId: 'org-1' },

  // Finished / Drinks
  { id: 'p10', code: '4001', name: 'Coca Cola 0.5', category: 'Ichimliklar', unit: 'pcs', organizationId: 'org-1' },
  { id: 'p11', code: '5001', name: 'Osh (Pors)', category: 'Tayyor Taomlar', unit: 'srv', organizationId: 'org-1' },
  { id: 'p12', code: '5002', name: 'Burger (Big)', category: 'Tayyor Taomlar', unit: 'pcs', organizationId: 'org-1' },
];

export const MOCK_HISTORY: OperationEntry[] = [
  // --- 1. START BALANCE (01.02.2025) ---
  {
    id: 'op-start-1',
    type: 'DAILY',
    date: '2025-02-01',
    time: '08:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'p1',
    productName: 'Mol go\'shti (Lahm)',
    quantity: 10,
    unit: 'kg',
    price: 1200000,
    organizationId: 'org-1'
  },
  {
    id: 'op-start-2',
    type: 'DAILY',
    date: '2025-02-01',
    time: '08:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'p7',
    productName: 'Guruch (Lazer)',
    quantity: 20,
    unit: 'kg',
    price: 300000,
    organizationId: 'org-1'
  },
  {
    id: 'op-start-3',
    type: 'DAILY',
    date: '2025-02-01',
    time: '09:00',
    kitchenId: 'k2',
    kitchenName: 'Filial - Chilonzor',
    productId: 'p10',
    productName: 'Coca Cola 0.5',
    quantity: 50,
    unit: 'pcs',
    price: 250000,
    organizationId: 'org-1'
  },

  // --- 2. INCOMING ---
  {
    id: 'op-in-1',
    type: 'INCOMING',
    date: '2025-02-05',
    time: '10:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'p1',
    productName: 'Mol go\'shti (Lahm)',
    quantity: 20,
    unit: 'kg',
    price: 2200000,
    organizationId: 'org-1'
  },
  {
    id: 'op-in-2',
    type: 'INCOMING',
    date: '2025-02-10',
    time: '11:30',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'p5',
    productName: 'Kungaboqar yog\'i (1L)',
    quantity: 100,
    unit: 'L',
    price: 1250000,
    organizationId: 'org-1'
  },
  {
    id: 'op-in-3',
    type: 'INCOMING',
    date: '2025-02-12',
    time: '09:15',
    kitchenId: 'k2',
    kitchenName: 'Filial - Chilonzor',
    productId: 'p12',
    productName: 'Burger (Big)',
    quantity: 100,
    unit: 'pcs',
    price: 1500000, 
    organizationId: 'org-1'
  },

  // --- 3. TRANSFERS ---
  {
    id: 'op-tr-1',
    type: 'TRANSFER',
    date: '2025-02-15',
    time: '14:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    toKitchenId: 'k2',
    toKitchenName: 'Filial - Chilonzor',
    productId: 'p1',
    productName: 'Mol go\'shti (Lahm)',
    quantity: 5,
    unit: 'kg',
    price: 600000,
    organizationId: 'org-1'
  },

  // --- 4. SALES (Revenue) ---
  {
    id: 'op-sale-1',
    type: 'SALE',
    date: '2025-02-05',
    time: '12:30',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'gen-sales',
    productName: 'Direct Sales',
    quantity: 1,
    unit: 'unit',
    price: 1500000,
    organizationId: 'org-1'
  },
  {
    id: 'op-sale-2',
    type: 'SALE',
    date: '2025-02-15',
    time: '13:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'gen-sales',
    productName: 'Direct Sales',
    quantity: 1,
    unit: 'unit',
    price: 2000000, 
    organizationId: 'org-1'
  },
  {
    id: 'op-sale-3',
    type: 'SALE',
    date: '2025-02-20',
    time: '19:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'gen-sales',
    productName: 'Direct Sales',
    quantity: 1,
    unit: 'unit',
    price: 3000000,
    organizationId: 'org-1'
  },
  {
    id: 'op-sale-4',
    type: 'SALE',
    date: '2025-02-18',
    time: '20:00',
    kitchenId: 'k2',
    kitchenName: 'Filial - Chilonzor',
    productId: 'p12',
    productName: 'Burger (Big)',
    quantity: 50,
    unit: 'pcs',
    price: 1250000,
    organizationId: 'org-1'
  },

  // --- 5. END BALANCE (28.02.2025) ---
  {
    id: 'op-end-1',
    type: 'DAILY',
    date: '2025-02-28',
    time: '23:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'p1',
    productName: 'Mol go\'shti (Lahm)',
    quantity: 5,
    unit: 'kg',
    price: 600000,
    organizationId: 'org-1'
  },
  {
    id: 'op-end-2',
    type: 'DAILY',
    date: '2025-02-28',
    time: '23:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'p7',
    productName: 'Guruch (Lazer)',
    quantity: 5, 
    unit: 'kg',
    price: 100000, 
    organizationId: 'org-1'
  },
  {
    id: 'op-end-3',
    type: 'DAILY',
    date: '2025-02-28',
    time: '23:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'p5',
    productName: 'Kungaboqar yog\'i (1L)',
    quantity: 40, 
    unit: 'L',
    price: 500000,
    organizationId: 'org-1'
  },

  // --- 6. DEMO DATA FOR NEXT MONTH (MARCH 2025) ---
  {
    id: 'op-future-1',
    type: 'INCOMING',
    date: '2025-03-02',
    time: '08:30',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'p2',
    productName: 'Qo\'y go\'shti',
    quantity: 50,
    unit: 'kg',
    price: 4500000,
    organizationId: 'org-1'
  },
  {
    id: 'op-future-2',
    type: 'SALE',
    date: '2025-03-05',
    time: '13:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'gen-sales',
    productName: 'Direct Sales',
    quantity: 1,
    unit: 'unit',
    price: 4200000,
    organizationId: 'org-1'
  },
  {
    id: 'op-future-3',
    type: 'TRANSFER',
    date: '2025-03-08',
    time: '10:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    toKitchenId: 'k2',
    toKitchenName: 'Filial - Chilonzor',
    productId: 'p5',
    productName: 'Kungaboqar yog\'i (1L)',
    quantity: 20,
    unit: 'L',
    price: 250000,
    organizationId: 'org-1'
  },
  {
    id: 'op-future-4',
    type: 'SALE',
    date: '2025-03-12',
    time: '19:45',
    kitchenId: 'k2',
    kitchenName: 'Filial - Chilonzor',
    productId: 'p12',
    productName: 'Burger (Big)',
    quantity: 120,
    unit: 'pcs',
    price: 3600000,
    organizationId: 'org-1'
  },
  {
    id: 'op-future-5',
    type: 'DAILY',
    date: '2025-03-15',
    time: '09:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'p1',
    productName: 'Mol go\'shti (Lahm)',
    quantity: 15,
    unit: 'kg',
    price: 1800000,
    organizationId: 'org-1'
  },

  // --- 7. DEMO DATA FOR 2026 (JAN/FEB) ---
  {
    id: 'op-2026-1',
    type: 'SALE',
    date: '2026-01-05',
    time: '12:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'gen-sales',
    productName: 'Direct Sales',
    quantity: 1,
    unit: 'unit',
    price: 5000000,
    organizationId: 'org-1'
  },
  {
    id: 'op-2026-2',
    type: 'INCOMING',
    date: '2026-01-10',
    time: '09:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'p1',
    productName: 'Mol go\'shti (Lahm)',
    quantity: 100,
    unit: 'kg',
    price: 12000000,
    organizationId: 'org-1'
  },
  {
    id: 'op-2026-3',
    type: 'SALE',
    date: '2026-02-15',
    time: '14:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'gen-sales',
    productName: 'Direct Sales',
    quantity: 1,
    unit: 'unit',
    price: 7500000,
    organizationId: 'org-1'
  },
  {
    id: 'op-2026-4',
    type: 'INCOMING',
    date: '2026-02-20',
    time: '10:00',
    kitchenId: 'k1',
    kitchenName: 'Markaziy Oshxona',
    productId: 'p5',
    productName: 'Kungaboqar yog\'i (1L)',
    quantity: 200,
    unit: 'L',
    price: 3000000,
    organizationId: 'org-1'
  },
];

export const MOCK_STATS: DashboardStats = {
  todayEntries: 5,
  incomingKg: 120,
  salesCount: 15,
};

export const OPERATION_TYPES = [
  { id: 'INCOMING', label: 'Kirim', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { id: 'DAILY', label: 'Qoldiq', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  { id: 'TRANSFER', label: 'O\'tkazma', color: 'text-purple-600 bg-purple-50 border-purple-100' },
  { id: 'SALE', label: 'Sotuv', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
] as const;
