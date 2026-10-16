// ============================================================
// ANOVA INVENTORY & SUPPLY CHAIN — ENTERPRISE SEED DATA
// Realistic multi-branch restaurant inventory records
// ============================================================

export const SEED_BRANCHES = [
  { id: 'b_downtown', name: 'Downtown Flagship', code: 'DT-01', city: 'Mumbai', address: 'Bandra West' },
  { id: 'b_uptown', name: 'Uptown Bistro', code: 'UP-02', city: 'Mumbai', address: 'Powai Central' },
  { id: 'b_westside', name: 'Westside Diner', code: 'WS-03', city: 'Pune', address: 'Koregaon Park' },
  { id: 'b_waterfront', name: 'Waterfront Lounge', code: 'WF-04', city: 'Goa', address: 'Panaji Promenade' }
];

export const INGREDIENT_CATEGORIES = [
  'Produce & Greens',
  'Dairy & Cheese',
  'Meat & Poultry',
  'Seafood',
  'Pantry & Grains',
  'Spices & Condiments',
  'Beverages & Syrups',
  'Bakery & Pastry'
];

export const CANONICAL_UNITS = [
  { code: 'kg', name: 'Kilograms', type: 'weight', baseFactor: 1 },
  { code: 'g', name: 'Grams', type: 'weight', baseFactor: 0.001 },
  { code: 'L', name: 'Liters', type: 'volume', baseFactor: 1 },
  { code: 'ml', name: 'Milliliters', type: 'volume', baseFactor: 0.001 },
  { code: 'pcs', name: 'Pieces/Units', type: 'count', baseFactor: 1 },
  { code: 'box', name: 'Standard Box', type: 'count', baseFactor: 1 }
];

export const SEED_SUPPLIERS = [
  {
    id: 'sup_01',
    name: 'Verdant Harvest Organic Farms',
    code: 'VHOF',
    category: 'Produce & Greens',
    contactPerson: 'Karan Mehra',
    email: 'karan@verdantharvest.in',
    phone: '+91 98201 11223',
    city: 'Nashik',
    leadTimeDays: 2,
    paymentTerms: 'Net 30',
    taxId: '27AABCV1234F1Z8',
    status: 'ACTIVE',
    rating: 4.8,
    activeOrderCount: 2
  },
  {
    id: 'sup_02',
    name: 'Himalayan Dairy & Artisanal Cheese',
    code: 'HDAC',
    category: 'Dairy & Cheese',
    contactPerson: 'Pooja Bhatt',
    email: 'orders@himalayandairy.com',
    phone: '+91 98202 22334',
    city: 'Anand',
    leadTimeDays: 3,
    paymentTerms: 'Net 15',
    taxId: '24AABCH5678G2Z1',
    status: 'ACTIVE',
    rating: 4.9,
    activeOrderCount: 1
  },
  {
    id: 'sup_03',
    name: 'Coastal Catch Seafood Exporters',
    code: 'CCSE',
    category: 'Seafood',
    contactPerson: 'David Dsouza',
    email: 'david@coastalcatch.co',
    phone: '+91 98333 44556',
    city: 'Ratnagiri',
    leadTimeDays: 1,
    paymentTerms: 'Due on Receipt',
    taxId: '27AABCC9012H3Z4',
    status: 'ACTIVE',
    rating: 4.7,
    activeOrderCount: 1
  },
  {
    id: 'sup_04',
    name: 'Imperial Prime Meats & Poultry',
    code: 'IPMP',
    category: 'Meat & Poultry',
    contactPerson: 'Rahil Khan',
    email: 'sales@imperialmeats.in',
    phone: '+91 98111 77889',
    city: 'Mumbai',
    leadTimeDays: 2,
    paymentTerms: 'Net 30',
    taxId: '27AABCI3456J4Z5',
    status: 'ACTIVE',
    rating: 4.6,
    activeOrderCount: 0
  },
  {
    id: 'sup_05',
    name: 'Spice Valley Heritage Spices',
    code: 'SVHS',
    category: 'Spices & Condiments',
    contactPerson: 'Lakshmi Nair',
    email: 'lakshmi@spicevalley.com',
    phone: '+91 98450 66778',
    city: 'Kochi',
    leadTimeDays: 5,
    paymentTerms: 'Net 45',
    taxId: '32AABCS7890K5Z6',
    status: 'ACTIVE',
    rating: 4.9,
    activeOrderCount: 0
  },
  {
    id: 'sup_06',
    name: 'Legacy Heritage Flours & Grains',
    code: 'LHFG',
    category: 'Pantry & Grains',
    contactPerson: 'Vipul Shah',
    email: 'vipul@legacygrains.in',
    phone: '+91 98920 33445',
    city: 'Ahmedabad',
    leadTimeDays: 4,
    paymentTerms: 'Net 30',
    taxId: '24AABCL1234L6Z7',
    status: 'INACTIVE',
    rating: 3.8,
    activeOrderCount: 0
  }
];

export const SEED_INGREDIENTS = [
  {
    id: 'ing_01',
    sku: 'ING-PRD-001',
    name: 'Organic Hass Avocados',
    category: 'Produce & Greens',
    baseUnit: 'kg',
    unitCost: 320,
    minThreshold: 15,
    maxThreshold: 60,
    reorderLevel: 20,
    primarySupplierId: 'sup_01',
    stockByBranch: {
      b_downtown: 34.5,
      b_uptown: 12.0, // Low stock
      b_westside: 28.0,
      b_waterfront: 8.5 // Critical
    },
    batches: [
      { id: 'bat_01_1', branchId: 'b_downtown', batchNumber: 'AVO-2610-A', qty: 20, expiryDate: '2026-10-22', receivedCost: 320 },
      { id: 'bat_01_2', branchId: 'b_downtown', batchNumber: 'AVO-2610-B', qty: 14.5, expiryDate: '2026-10-28', receivedCost: 320 },
      { id: 'bat_01_3', branchId: 'b_uptown', batchNumber: 'AVO-2610-C', qty: 12.0, expiryDate: '2026-10-18', receivedCost: 325 }, // Expiring soon
      { id: 'bat_01_4', branchId: 'b_westside', batchNumber: 'AVO-2610-D', qty: 28.0, expiryDate: '2026-10-25', receivedCost: 320 },
      { id: 'bat_01_5', branchId: 'b_waterfront', batchNumber: 'AVO-2610-E', qty: 8.5, expiryDate: '2026-10-19', receivedCost: 330 }
    ]
  },
  {
    id: 'ing_02',
    sku: 'ING-DAI-002',
    name: 'Artisanal Burrata Cheese',
    category: 'Dairy & Cheese',
    baseUnit: 'kg',
    unitCost: 650,
    minThreshold: 10,
    maxThreshold: 40,
    reorderLevel: 15,
    primarySupplierId: 'sup_02',
    stockByBranch: {
      b_downtown: 18.0,
      b_uptown: 9.0, // Low stock
      b_westside: 14.0,
      b_waterfront: 6.0 // Critical
    },
    batches: [
      { id: 'bat_02_1', branchId: 'b_downtown', batchNumber: 'BUR-2610-1', qty: 18.0, expiryDate: '2026-10-20', receivedCost: 650 },
      { id: 'bat_02_2', branchId: 'b_uptown', batchNumber: 'BUR-2610-2', qty: 9.0, expiryDate: '2026-10-17', receivedCost: 650 }, // Expiring in 2 days
      { id: 'bat_02_3', branchId: 'b_westside', batchNumber: 'BUR-2610-3', qty: 14.0, expiryDate: '2026-10-22', receivedCost: 650 },
      { id: 'bat_02_4', branchId: 'b_waterfront', batchNumber: 'BUR-2610-4', qty: 6.0, expiryDate: '2026-10-18', receivedCost: 660 }
    ]
  },
  {
    id: 'ing_03',
    sku: 'ING-SEA-003',
    name: 'Wild Atlantic Salmon Fillets',
    category: 'Seafood',
    baseUnit: 'kg',
    unitCost: 1450,
    minThreshold: 12,
    maxThreshold: 50,
    reorderLevel: 18,
    primarySupplierId: 'sup_03',
    stockByBranch: {
      b_downtown: 26.5,
      b_uptown: 19.0,
      b_westside: 8.0, // Critical
      b_waterfront: 32.0
    },
    batches: [
      { id: 'bat_03_1', branchId: 'b_downtown', batchNumber: 'SAL-2610-X', qty: 26.5, expiryDate: '2026-10-21', receivedCost: 1450 },
      { id: 'bat_03_2', branchId: 'b_uptown', batchNumber: 'SAL-2610-Y', qty: 19.0, expiryDate: '2026-10-22', receivedCost: 1450 },
      { id: 'bat_03_3', branchId: 'b_westside', batchNumber: 'SAL-2610-Z', qty: 8.0, expiryDate: '2026-10-20', receivedCost: 1480 },
      { id: 'bat_03_4', branchId: 'b_waterfront', batchNumber: 'SAL-2610-W', qty: 32.0, expiryDate: '2026-10-24', receivedCost: 1450 }
    ]
  },
  {
    id: 'ing_04',
    sku: 'ING-MEA-004',
    name: 'Prime Wagyu Striploin (MB4-5)',
    category: 'Meat & Poultry',
    baseUnit: 'kg',
    unitCost: 3800,
    minThreshold: 8,
    maxThreshold: 30,
    reorderLevel: 12,
    primarySupplierId: 'sup_04',
    stockByBranch: {
      b_downtown: 14.2,
      b_uptown: 10.5,
      b_westside: 11.0,
      b_waterfront: 5.5 // Low stock
    },
    batches: [
      { id: 'bat_04_1', branchId: 'b_downtown', batchNumber: 'WAG-2610-01', qty: 14.2, expiryDate: '2026-10-27', receivedCost: 3800 },
      { id: 'bat_04_2', branchId: 'b_uptown', batchNumber: 'WAG-2610-02', qty: 10.5, expiryDate: '2026-10-26', receivedCost: 3800 },
      { id: 'bat_04_3', branchId: 'b_westside', batchNumber: 'WAG-2610-03', qty: 11.0, expiryDate: '2026-10-29', receivedCost: 3800 },
      { id: 'bat_04_4', branchId: 'b_waterfront', batchNumber: 'WAG-2610-04', qty: 5.5, expiryDate: '2026-10-25', receivedCost: 3850 }
    ]
  },
  {
    id: 'ing_05',
    sku: 'ING-PAN-005',
    name: 'Italian Carnaroli Risotto Rice',
    category: 'Pantry & Grains',
    baseUnit: 'kg',
    unitCost: 280,
    minThreshold: 25,
    maxThreshold: 120,
    reorderLevel: 35,
    primarySupplierId: 'sup_06',
    stockByBranch: {
      b_downtown: 75.0,
      b_uptown: 42.0,
      b_westside: 60.0,
      b_waterfront: 48.0
    },
    batches: [
      { id: 'bat_05_1', branchId: 'b_downtown', batchNumber: 'RIS-2608-01', qty: 75.0, expiryDate: '2027-04-15', receivedCost: 280 },
      { id: 'bat_05_2', branchId: 'b_uptown', batchNumber: 'RIS-2608-02', qty: 42.0, expiryDate: '2027-04-15', receivedCost: 280 },
      { id: 'bat_05_3', branchId: 'b_westside', batchNumber: 'RIS-2608-03', qty: 60.0, expiryDate: '2027-04-15', receivedCost: 280 },
      { id: 'bat_05_4', branchId: 'b_waterfront', batchNumber: 'RIS-2608-04', qty: 48.0, expiryDate: '2027-04-15', receivedCost: 280 }
    ]
  },
  {
    id: 'ing_06',
    sku: 'ING-SPI-006',
    name: 'Kashmiri Mongra Saffron',
    category: 'Spices & Condiments',
    baseUnit: 'g',
    unitCost: 350,
    minThreshold: 50,
    maxThreshold: 250,
    reorderLevel: 80,
    primarySupplierId: 'sup_05',
    stockByBranch: {
      b_downtown: 140,
      b_uptown: 95,
      b_westside: 45, // Critical low
      b_waterfront: 110
    },
    batches: [
      { id: 'bat_06_1', branchId: 'b_downtown', batchNumber: 'SAF-2609-01', qty: 140, expiryDate: '2027-09-30', receivedCost: 350 },
      { id: 'bat_06_2', branchId: 'b_uptown', batchNumber: 'SAF-2609-02', qty: 95, expiryDate: '2027-09-30', receivedCost: 350 },
      { id: 'bat_06_3', branchId: 'b_westside', batchNumber: 'SAF-2609-03', qty: 45, expiryDate: '2027-09-30', receivedCost: 350 },
      { id: 'bat_06_4', branchId: 'b_waterfront', batchNumber: 'SAF-2609-04', qty: 110, expiryDate: '2027-09-30', receivedCost: 350 }
    ]
  },
  {
    id: 'ing_07',
    sku: 'ING-PRD-007',
    name: 'San Marzano DOP Tomatoes',
    category: 'Produce & Greens',
    baseUnit: 'can',
    unitCost: 195,
    minThreshold: 30,
    maxThreshold: 150,
    reorderLevel: 45,
    primarySupplierId: 'sup_01',
    stockByBranch: {
      b_downtown: 85,
      b_uptown: 22, // Low stock
      b_westside: 64,
      b_waterfront: 40
    },
    batches: [
      { id: 'bat_07_1', branchId: 'b_downtown', batchNumber: 'TOM-2610-01', qty: 85, expiryDate: '2027-06-30', receivedCost: 195 },
      { id: 'bat_07_2', branchId: 'b_uptown', batchNumber: 'TOM-2610-02', qty: 22, expiryDate: '2027-06-30', receivedCost: 195 },
      { id: 'bat_07_3', branchId: 'b_westside', batchNumber: 'TOM-2610-03', qty: 64, expiryDate: '2027-06-30', receivedCost: 195 },
      { id: 'bat_07_4', branchId: 'b_waterfront', batchNumber: 'TOM-2610-04', qty: 40, expiryDate: '2027-06-30', receivedCost: 195 }
    ]
  },
  {
    id: 'ing_08',
    sku: 'ING-BEV-008',
    name: 'Cold Pressed Sicilian Olive Oil',
    category: 'Beverages & Syrups',
    baseUnit: 'L',
    unitCost: 980,
    minThreshold: 20,
    maxThreshold: 80,
    reorderLevel: 25,
    primarySupplierId: 'sup_01',
    stockByBranch: {
      b_downtown: 45.0,
      b_uptown: 28.0,
      b_westside: 18.0, // Low stock
      b_waterfront: 32.0
    },
    batches: [
      { id: 'bat_08_1', branchId: 'b_downtown', batchNumber: 'OIL-2609-01', qty: 45.0, expiryDate: '2027-08-15', receivedCost: 980 },
      { id: 'bat_08_2', branchId: 'b_uptown', batchNumber: 'OIL-2609-02', qty: 28.0, expiryDate: '2027-08-15', receivedCost: 980 },
      { id: 'bat_08_3', branchId: 'b_westside', batchNumber: 'OIL-2609-03', qty: 18.0, expiryDate: '2027-08-15', receivedCost: 980 },
      { id: 'bat_08_4', branchId: 'b_waterfront', batchNumber: 'OIL-2609-04', qty: 32.0, expiryDate: '2027-08-15', receivedCost: 980 }
    ]
  }
];

export const SEED_PURCHASE_ORDERS = [
  {
    id: 'po_1001',
    poNumber: 'PO-2026-089',
    supplierId: 'sup_01',
    branchId: 'b_downtown',
    status: 'ORDERED', // DRAFT -> SUBMITTED -> APPROVED -> ORDERED -> PARTIALLY_RECEIVED -> RECEIVED -> CANCELLED
    createdAt: '2026-10-12T10:30:00Z',
    expectedDate: '2026-10-16',
    approvedBy: 'Arjun Verma (Director)',
    approvedAt: '2026-10-12T14:15:00Z',
    items: [
      { ingredientId: 'ing_01', orderedQty: 25, unit: 'kg', unitPrice: 320, receivedQty: 0, rejectedQty: 0, damagedQty: 0 },
      { ingredientId: 'ing_07', orderedQty: 40, unit: 'can', unitPrice: 195, receivedQty: 0, rejectedQty: 0, damagedQty: 0 }
    ],
    subtotal: 15800,
    tax: 790,
    totalAmount: 16590,
    receiptHistory: []
  },
  {
    id: 'po_1002',
    poNumber: 'PO-2026-090',
    supplierId: 'sup_02',
    branchId: 'b_uptown',
    status: 'PARTIALLY_RECEIVED',
    createdAt: '2026-10-11T09:00:00Z',
    expectedDate: '2026-10-14',
    approvedBy: 'Arjun Verma (Director)',
    approvedAt: '2026-10-11T11:00:00Z',
    items: [
      { ingredientId: 'ing_02', orderedQty: 20, unit: 'kg', unitPrice: 650, receivedQty: 10, rejectedQty: 2, damagedQty: 1 }
    ],
    subtotal: 13000,
    tax: 650,
    totalAmount: 13650,
    receiptHistory: [
      {
        grnNumber: 'GRN-2026-041',
        receivedAt: '2026-10-14T11:20:00Z',
        receivedBy: 'Rohan Sharma (Uptown Chef)',
        batchNumber: 'BUR-2610-2',
        acceptedQty: 10,
        rejectedQty: 2,
        damagedQty: 1,
        rejectionReason: 'Damaged packaging & seal broken during transit'
      }
    ]
  },
  {
    id: 'po_1003',
    poNumber: 'PO-2026-091',
    supplierId: 'sup_03',
    branchId: 'b_westside',
    status: 'SUBMITTED',
    createdAt: '2026-10-15T08:00:00Z',
    expectedDate: '2026-10-17',
    approvedBy: null,
    approvedAt: null,
    items: [
      { ingredientId: 'ing_03', orderedQty: 15, unit: 'kg', unitPrice: 1450, receivedQty: 0, rejectedQty: 0, damagedQty: 0 }
    ],
    subtotal: 21750,
    tax: 1087.5,
    totalAmount: 22837.5,
    receiptHistory: []
  },
  {
    id: 'po_1004',
    poNumber: 'PO-2026-088',
    supplierId: 'sup_04',
    branchId: 'b_downtown',
    status: 'RECEIVED',
    createdAt: '2026-10-08T10:00:00Z',
    expectedDate: '2026-10-10',
    approvedBy: 'Arjun Verma (Director)',
    approvedAt: '2026-10-08T12:00:00Z',
    items: [
      { ingredientId: 'ing_04', orderedQty: 15, unit: 'kg', unitPrice: 3800, receivedQty: 15, rejectedQty: 0, damagedQty: 0 }
    ],
    subtotal: 57000,
    tax: 2850,
    totalAmount: 59850,
    receiptHistory: [
      {
        grnNumber: 'GRN-2026-039',
        receivedAt: '2026-10-10T14:30:00Z',
        receivedBy: 'Arjun Verma',
        batchNumber: 'WAG-2610-01',
        acceptedQty: 15,
        rejectedQty: 0,
        damagedQty: 0,
        rejectionReason: null
      }
    ]
  }
];

export const SEED_TRANSFERS = [
  {
    id: 'tr_201',
    transferNumber: 'TR-2026-015',
    fromBranchId: 'b_downtown',
    toBranchId: 'b_uptown',
    status: 'IN_TRANSIT', // DRAFT -> DISPATCHED -> IN_TRANSIT -> RECEIVED -> CANCELLED
    dispatchedAt: '2026-10-15T09:30:00Z',
    dispatchedBy: 'Sanjay Rawat (Downtown Storekeeper)',
    receivedAt: null,
    receivedBy: null,
    items: [
      { ingredientId: 'ing_01', qty: 10, unit: 'kg', unitCost: 320, batchNumber: 'AVO-2610-B' }
    ],
    notes: 'Urgent avocado stock replenishment for evening service'
  },
  {
    id: 'tr_202',
    transferNumber: 'TR-2026-014',
    fromBranchId: 'b_downtown',
    toBranchId: 'b_westside',
    status: 'RECEIVED',
    dispatchedAt: '2026-10-13T10:00:00Z',
    dispatchedBy: 'Sanjay Rawat',
    receivedAt: '2026-10-14T11:45:00Z',
    receivedBy: 'Vikram Joshi (Westside Chef)',
    items: [
      { ingredientId: 'ing_05', qty: 20, unit: 'kg', unitCost: 280, batchNumber: 'RIS-2608-01' }
    ],
    notes: 'Weekly standard risotto grain transfer'
  }
];

export const SEED_WASTAGE = [
  {
    id: 'wst_301',
    wasteNumber: 'WST-2026-052',
    branchId: 'b_uptown',
    ingredientId: 'ing_02',
    batchNumber: 'BUR-2610-2',
    qty: 1.5,
    unit: 'kg',
    unitCost: 650,
    totalCost: 975,
    reason: 'EXPIRED', // EXPIRED, SPOILED, PREP_LOSS, HANDLING_DAMAGE
    loggedBy: 'Chef Anita (Uptown)',
    date: '2026-10-14T18:00:00Z',
    notes: 'Seal broke in display chiller, discarded for safety standards'
  },
  {
    id: 'wst_302',
    wasteNumber: 'WST-2026-051',
    branchId: 'b_westside',
    ingredientId: 'ing_01',
    batchNumber: 'AVO-2610-D',
    qty: 2.0,
    unit: 'kg',
    unitCost: 320,
    totalCost: 640,
    reason: 'SPOILED',
    loggedBy: 'Vikram Joshi',
    date: '2026-10-13T14:20:00Z',
    notes: 'Over-ripened during weekend heat spike'
  },
  {
    id: 'wst_303',
    wasteNumber: 'WST-2026-050',
    branchId: 'b_downtown',
    ingredientId: 'ing_03',
    batchNumber: 'SAL-2610-X',
    qty: 0.8,
    unit: 'kg',
    unitCost: 1450,
    totalCost: 1160,
    reason: 'PREP_LOSS',
    loggedBy: 'Sous Chef Tariq',
    date: '2026-10-12T16:00:00Z',
    notes: 'Excess trim off-cut during sashimi preparation'
  }
];

export const SEED_STOCK_MOVEMENTS = [
  {
    id: 'mov_401',
    type: 'GOODS_RECEIPT',
    reference: 'GRN-2026-039 (PO-2026-088)',
    ingredientId: 'ing_04',
    branchId: 'b_downtown',
    deltaQty: +15,
    unit: 'kg',
    resultingBalance: 14.2,
    performedBy: 'Arjun Verma',
    timestamp: '2026-10-10T14:30:00Z',
    notes: 'Receipt of Wagyu Striploin from Imperial Prime Meats'
  },
  {
    id: 'mov_402',
    type: 'TRANSFER_DISPATCH',
    reference: 'TR-2026-015',
    ingredientId: 'ing_01',
    branchId: 'b_downtown',
    deltaQty: -10,
    unit: 'kg',
    resultingBalance: 34.5,
    performedBy: 'Sanjay Rawat',
    timestamp: '2026-10-15T09:30:00Z',
    notes: 'Dispatched to Uptown Bistro'
  },
  {
    id: 'mov_403',
    type: 'WASTAGE_DEDUCTION',
    reference: 'WST-2026-052',
    ingredientId: 'ing_02',
    branchId: 'b_uptown',
    deltaQty: -1.5,
    unit: 'kg',
    resultingBalance: 9.0,
    performedBy: 'Chef Anita',
    timestamp: '2026-10-14T18:00:00Z',
    notes: 'Burrata cheese spoilage write-off'
  }
];
