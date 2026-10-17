// ============================================================
// ANOVA SUPPLIER SERVICE
// Handles Supplier Profiles, Catalogs, Purchasing Stats & Status
// ============================================================

import { SEED_SUPPLIERS, SEED_INGREDIENTS } from './mockData.js';
import { apiClient } from '../../../api/client.js';

export function normalizeSupplier(doc) {
  if (!doc) return null;
  const supId = String(doc._id || doc.id);
  return {
    ...doc,
    id: supId,
    _id: supId,
    name: doc.name,
    code: doc.code,
    category: doc.category,
    contactPerson: doc.contactPerson,
    email: doc.email,
    phone: doc.phone,
    city: doc.city || 'Mumbai',
    leadTimeDays: Number(doc.leadTimeDays || 2),
    paymentTerms: doc.paymentTerms || 'Net 30',
    taxId: doc.taxId || '',
    status: doc.status || 'ACTIVE',
    rating: Number(doc.rating || 4.5),
    activeOrderCount: Number(doc.activeOrderCount || 0)
  };
}

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
  },

  // ==========================================
  // REMOTE BACKEND / ATLAS SYNCHRONIZATION
  // ==========================================
  async syncFromBackend() {
    try {
      const res = await apiClient('/api/inventory/suppliers');
      if (res && res.success && Array.isArray(res.data)) {
        const normalized = res.data.map(normalizeSupplier);
        saveSuppliersData(normalized);
        return normalized;
      }
    } catch (err) {
      console.warn('[SupplierService] Backend sync failed, using cached store:', err.message);
    }
    return this.getSuppliers();
  },

  async saveSupplierRemote(supplierData) {
    const isUpdate = Boolean(supplierData._id || (supplierData.id && supplierData.id.length === 24));
    const targetId = supplierData._id || supplierData.id;

    const payload = {
      name: supplierData.name,
      code: supplierData.code,
      category: supplierData.category,
      contactPerson: supplierData.contactPerson,
      email: supplierData.email,
      phone: supplierData.phone,
      city: supplierData.city || 'Mumbai',
      leadTimeDays: Number(supplierData.leadTimeDays || 2),
      paymentTerms: supplierData.paymentTerms || 'Net 30',
      taxId: supplierData.taxId || undefined,
      rating: Number(supplierData.rating || 4.5)
    };

    try {
      const endpoint = isUpdate ? `/api/inventory/suppliers/${targetId}` : '/api/inventory/suppliers';
      const method = isUpdate ? 'PUT' : 'POST';
      const res = await apiClient(endpoint, { method, body: payload });
      if (res && res.success && res.data) {
        const normalized = normalizeSupplier(res.data);
        const list = getSuppliersData();
        const idx = list.findIndex(s => s.id === normalized.id);
        if (idx !== -1) {
          list[idx] = normalized;
        } else {
          list.unshift(normalized);
        }
        saveSuppliersData(list);
        return normalized;
      }
    } catch (err) {
      console.warn('[SupplierService] Remote save failed, falling back to local:', err.message);
    }
    return this.saveSupplier(supplierData);
  },

  async toggleStatusRemote(id) {
    try {
      const res = await apiClient(`/api/inventory/suppliers/${id}/status`, { method: 'PATCH' });
      if (res && res.success && res.data) {
        const normalized = normalizeSupplier(res.data);
        const list = getSuppliersData();
        const idx = list.findIndex(s => s.id === normalized.id);
        if (idx !== -1) {
          list[idx] = normalized;
          saveSuppliersData(list);
        }
        return normalized;
      }
    } catch (err) {
      console.warn('[SupplierService] Remote toggle status failed, falling back:', err.message);
    }
    return this.toggleStatus(id);
  }
};
