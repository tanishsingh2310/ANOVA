// ============================================================
// ANOVA SUPPLIER SERVICE
// Handles Supplier Profiles, Catalogs, Purchasing Stats & Status
// ============================================================

import { SEED_SUPPLIERS, SEED_INGREDIENTS } from './mockData.js';

const SUPPLIERS_KEY = 'anova_inventory_suppliers';

function getSuppliersData() {
  try {
    const raw = localStorage.getItem(SUPPLIERS_KEY);
    if (!raw) {
      localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(SEED_SUPPLIERS));
      return SEED_SUPPLIERS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_SUPPLIERS;
  }
}

function saveSuppliersData(data) {
  try {
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving suppliers:', err);
  }
}

export const SupplierService = {
  getSuppliers(filter = {}) {
    let suppliers = getSuppliersData();
    const { status, category, search } = filter;

    if (status && status !== 'ALL') {
      suppliers = suppliers.filter(s => s.status === status);
    }

    if (category && category !== 'ALL') {
      suppliers = suppliers.filter(s => s.category === category);
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase();
      suppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
      );
    }

    return suppliers;
  },

  getSupplierById(id) {
    const list = getSuppliersData();
    return list.find(s => s.id === id) || null;
  },

  getSuppliedIngredients(supplierId) {
    try {
      const raw = localStorage.getItem('anova_inventory_ingredients');
      const items = raw ? JSON.parse(raw) : SEED_INGREDIENTS;
      return items.filter(i => i.primarySupplierId === supplierId);
    } catch {
      return [];
    }
  },

  saveSupplier(supplierData) {
    const list = getSuppliersData();
    if (supplierData.id) {
      const idx = list.findIndex(s => s.id === supplierData.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...supplierData };
        saveSuppliersData(list);
        return list[idx];
      }
    }

    const newId = `sup_${Date.now().toString(36)}`;
    const newCode = supplierData.code || supplierData.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
    const newSupplier = {
      ...supplierData,
      id: newId,
      code: newCode,
      status: supplierData.status || 'ACTIVE',
      rating: supplierData.rating || 4.5,
      activeOrderCount: 0
    };
    list.unshift(newSupplier);
    saveSuppliersData(list);
    return newSupplier;
  },

  toggleStatus(id) {
    const list = getSuppliersData();
    const supplier = list.find(s => s.id === id);
    if (!supplier) throw new Error('Supplier not found');

    supplier.status = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    saveSuppliersData(list);
    return supplier;
  }
};
