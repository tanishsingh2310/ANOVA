require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Supplier = require('../models/Supplier');
const Ingredient = require('../models/Ingredient');
const PurchaseOrder = require('../models/PurchaseOrder');
const StockMovement = require('../models/StockMovement');

// -------------------------------------------------------------
// SEED DATA SOURCE
// -------------------------------------------------------------
const SEED_SUPPLIERS = [
  {
    code: 'VHOF',
    name: 'Verdant Harvest Organic Farms',
    category: 'Produce & Greens',
    contactPerson: 'Karan Mehra',
    email: 'karan@verdantharvest.in',
    phone: '+91 98201 11223',
    city: 'Nashik',
    leadTimeDays: 2,
    paymentTerms: 'Net 30',
    taxId: '27AABCV1234F1Z8',
    status: 'ACTIVE',
    rating: 4.8
  },
  {
    code: 'HDAC',
    name: 'Himalayan Dairy & Artisanal Cheese',
    category: 'Dairy & Cheese',
    contactPerson: 'Pooja Bhatt',
    email: 'orders@himalayandairy.com',
    phone: '+91 98202 22334',
    city: 'Anand',
    leadTimeDays: 3,
    paymentTerms: 'Net 15',
    taxId: '24AABCH5678G2Z1',
    status: 'ACTIVE',
    rating: 4.9
  },
  {
    code: 'CCSE',
    name: 'Coastal Catch Seafood Exporters',
    category: 'Seafood',
    contactPerson: 'David Dsouza',
    email: 'david@coastalcatch.co',
    phone: '+91 98333 44556',
    city: 'Ratnagiri',
    leadTimeDays: 1,
    paymentTerms: 'Due on Receipt',
    taxId: '27AABCC9012H3Z4',
    status: 'ACTIVE',
    rating: 4.7
  },
  {
    code: 'IPMP',
    name: 'Imperial Prime Meats & Poultry',
    category: 'Meat & Poultry',
    contactPerson: 'Rahil Khan',
    email: 'sales@imperialmeats.in',
    phone: '+91 98111 77889',
    city: 'Mumbai',
    leadTimeDays: 2,
    paymentTerms: 'Net 30',
    taxId: '27AABCI3456J4Z5',
    status: 'ACTIVE',
    rating: 4.6
  },
  {
    code: 'SVHS',
    name: 'Spice Valley Heritage Spices',
    category: 'Spices & Condiments',
    contactPerson: 'Ananya Nair',
    email: 'ananya@spicevalley.com',
    phone: '+91 98450 55667',
    city: 'Kochi',
    leadTimeDays: 3,
    paymentTerms: 'Net 30',
    taxId: '32AABCS7890K5Z6',
    status: 'ACTIVE',
    rating: 4.9
  },
  {
    code: 'NATH',
    name: 'Nilgiri Artisanal Tea & Herbals',
    category: 'Beverages & Syrups',
    contactPerson: 'Devika Menon',
    email: 'orders@nilgiritea.com',
    phone: '+91 94430 11223',
    city: 'Ooty',
    leadTimeDays: 3,
    paymentTerms: 'Net 30',
    taxId: '33AABCN1234P1Z2',
    status: 'ACTIVE',
    rating: 4.5
  }
];

const SEED_INGREDIENTS = [
  {
    sku: 'ING-PRD-001',
    name: 'Organic Hass Avocados',
    category: 'Produce & Greens',
    baseUnit: 'kg',
    unitCost: 320,
    minThreshold: 15,
    maxThreshold: 60,
    reorderLevel: 20,
    supplierCode: 'VHOF',
    stockByBranch: {
      b_downtown: 34.5,
      b_uptown: 12.0,
      b_westside: 28.0,
      b_waterfront: 8.5
    },
    batches: [
      { branch: 'b_downtown', batchNumber: 'AVO-2610-A', quantity: 20, expiryDate: new Date('2026-10-22'), receivedCost: 320 },
      { branch: 'b_downtown', batchNumber: 'AVO-2610-B', quantity: 14.5, expiryDate: new Date('2026-10-28'), receivedCost: 320 },
      { branch: 'b_uptown', batchNumber: 'AVO-2610-C', quantity: 12.0, expiryDate: new Date('2026-10-18'), receivedCost: 325 },
      { branch: 'b_westside', batchNumber: 'AVO-2610-D', quantity: 28.0, expiryDate: new Date('2026-10-25'), receivedCost: 320 },
      { branch: 'b_waterfront', batchNumber: 'AVO-2610-E', quantity: 8.5, expiryDate: new Date('2026-10-19'), receivedCost: 330 }
    ]
  },
  {
    sku: 'ING-DAI-002',
    name: 'Artisanal Burrata Cheese',
    category: 'Dairy & Cheese',
    baseUnit: 'kg',
    unitCost: 650,
    minThreshold: 10,
    maxThreshold: 40,
    reorderLevel: 15,
    supplierCode: 'HDAC',
    stockByBranch: {
      b_downtown: 18.0,
      b_uptown: 9.0,
      b_westside: 14.0,
      b_waterfront: 6.0
    },
    batches: [
      { branch: 'b_downtown', batchNumber: 'BUR-2610-1', quantity: 18.0, expiryDate: new Date('2026-10-20'), receivedCost: 650 },
      { branch: 'b_uptown', batchNumber: 'BUR-2610-2', quantity: 9.0, expiryDate: new Date('2026-10-17'), receivedCost: 650 },
      { branch: 'b_westside', batchNumber: 'BUR-2610-3', quantity: 14.0, expiryDate: new Date('2026-10-22'), receivedCost: 650 },
      { branch: 'b_waterfront', batchNumber: 'BUR-2610-4', quantity: 6.0, expiryDate: new Date('2026-10-18'), receivedCost: 660 }
    ]
  },
  {
    sku: 'ING-SEA-003',
    name: 'Norwegian Atlantic Salmon',
    category: 'Seafood',
    baseUnit: 'kg',
    unitCost: 1450,
    minThreshold: 8,
    maxThreshold: 30,
    reorderLevel: 10,
    supplierCode: 'CCSE',
    stockByBranch: {
      b_downtown: 14.0,
      b_uptown: 7.5,
      b_westside: 11.0,
      b_waterfront: 18.0
    },
    batches: [
      { branch: 'b_downtown', batchNumber: 'SAL-2610-1', quantity: 14.0, expiryDate: new Date('2026-10-21'), receivedCost: 1450 },
      { branch: 'b_uptown', batchNumber: 'SAL-2610-2', quantity: 7.5, expiryDate: new Date('2026-10-19'), receivedCost: 1450 }
    ]
  },
  {
    sku: 'ING-MEA-004',
    name: 'Corn-Fed Chicken Breast',
    category: 'Meat & Poultry',
    baseUnit: 'kg',
    unitCost: 280,
    minThreshold: 25,
    maxThreshold: 100,
    reorderLevel: 35,
    supplierCode: 'IPMP',
    stockByBranch: {
      b_downtown: 42.0,
      b_uptown: 30.0,
      b_westside: 38.0,
      b_waterfront: 20.0
    },
    batches: [
      { branch: 'b_downtown', batchNumber: 'CHK-2610-1', quantity: 42.0, expiryDate: new Date('2026-10-24'), receivedCost: 280 },
      { branch: 'b_uptown', batchNumber: 'CHK-2610-2', quantity: 30.0, expiryDate: new Date('2026-10-23'), receivedCost: 280 }
    ]
  },
  {
    sku: 'ING-PAN-005',
    name: 'Italian Carnaroli Risotto Rice',
    category: 'Pantry & Grains',
    baseUnit: 'kg',
    unitCost: 280,
    minThreshold: 30,
    maxThreshold: 150,
    reorderLevel: 40,
    supplierCode: 'SVHS',
    stockByBranch: {
      b_downtown: 85.0,
      b_uptown: 60.0,
      b_westside: 70.0,
      b_waterfront: 45.0
    },
    batches: [
      { branch: 'b_downtown', batchNumber: 'RIC-2610-1', quantity: 85.0, expiryDate: new Date('2027-04-15'), receivedCost: 280 },
      { branch: 'b_uptown', batchNumber: 'RIC-2610-2', quantity: 60.0, expiryDate: new Date('2027-04-15'), receivedCost: 280 }
    ]
  }
];

const connectDB = require('../config/db');

async function seedDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas cluster...');
    const conn = await connectDB();
    if (!conn) {
      console.error('❌ Error: Could not connect to MongoDB. Please check your connection string.');
      process.exit(1);
    }
    console.log(`✅ Connected successfully to database: "${mongoose.connection.name}"`);

    // ---------------------------------------------------------
    // SAFETY CHECK: NEVER TOUCH TEAMS' COLLECTIONS ('branches', 'users')
    // ---------------------------------------------------------
    console.log('🌱 Seeding ANOVA Inventory & Supply Chain data...');

    // 1. Seed Suppliers
    const supplierMap = {};
    for (const sup of SEED_SUPPLIERS) {
      const doc = await Supplier.findOneAndUpdate(
        { code: sup.code },
        sup,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      supplierMap[sup.code] = doc._id;
      console.log(`  ✓ Supplier synced: [${doc.code}] ${doc.name}`);
    }

    // 2. Seed Ingredients
    const ingredientMap = {};
    for (const ing of SEED_INGREDIENTS) {
      const payload = {
        sku: ing.sku,
        name: ing.name,
        category: ing.category,
        baseUnit: ing.baseUnit,
        unitCost: ing.unitCost,
        minThreshold: ing.minThreshold,
        maxThreshold: ing.maxThreshold,
        reorderLevel: ing.reorderLevel,
        primarySupplier: supplierMap[ing.supplierCode],
        stockByBranch: ing.stockByBranch,
        batches: ing.batches
      };

      const doc = await Ingredient.findOneAndUpdate(
        { sku: ing.sku },
        payload,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      ingredientMap[ing.sku] = doc._id;
      console.log(`  ✓ Ingredient synced: [${doc.sku}] ${doc.name}`);
    }

    // 2b. Link supplied ingredients to their respective suppliers
    for (const sup of SEED_SUPPLIERS) {
      const supId = supplierMap[sup.code];
      const supplied = await Ingredient.find({ primarySupplier: supId }).select('_id');
      await Supplier.findByIdAndUpdate(supId, {
        suppliedIngredients: supplied.map(s => s._id)
      });
    }
    console.log('  ✓ Supplier catalog linkages updated');

    // 3. Seed Sample Purchase Order
    const existingPO = await PurchaseOrder.findOne({ poNumber: 'PO-2026-1001' });
    if (!existingPO && supplierMap['VHOF'] && ingredientMap['ING-PRD-001']) {
      await PurchaseOrder.create({
        poNumber: 'PO-2026-1001',
        supplier: supplierMap['VHOF'],
        branch: 'b_downtown',
        branchRef: new mongoose.Types.ObjectId('6ad0e90a53cc462cbaaec9fa'),
        status: 'ORDERED',
        expectedDeliveryDate: new Date('2026-10-25'),
        items: [
          {
            ingredient: ingredientMap['ING-PRD-001'],
            orderedQty: 25,
            unit: 'kg',
            unitPrice: 320,
            receivedQty: 0,
            rejectedQty: 0,
            damagedQty: 0
          }
        ],
        subtotal: 8000,
        tax: 400,
        totalAmount: 8400
      });
      console.log('  ✓ Sample Purchase Order synced: [PO-2026-1001]');
    }

    console.log('\n🎉 Phase 1 Database Seeding Completed Successfully!');
    console.log('Collections updated: suppliers, ingredients, purchaseorders');
    console.log('Existing collections ("branches", "users") were untouched.');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedDatabase();
