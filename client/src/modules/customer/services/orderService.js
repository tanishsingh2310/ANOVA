/**
 * Single data-access layer for ordering.
 * Flip USE_MOCK to false when Member 3's API is ready — that is the one-line swap.
 */
import api from '../../../api/axios';
import { branches as mockBranches, menuItems as mockMenuItems } from '../mock/menu';

const USE_MOCK = true; // <-- flip to false for real API

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export async function getBranches() {
  if (USE_MOCK) {
    await delay();
    return mockBranches;
  }
  const { data } = await api.get('/branches');
  return data.data;
}

export async function getBranch(branchId) {
  if (USE_MOCK) {
    await delay();
    const branch = mockBranches.find((b) => b._id === branchId);
    if (!branch) throw new Error('Branch not found');
    return branch;
  }
  const { data } = await api.get(`/branches/${branchId}`);
  return data.data;
}

export async function getMenu(branchId) {
  if (USE_MOCK) {
    await delay();
    return mockMenuItems.filter((item) => item.branchId === branchId);
  }
  const { data } = await api.get(`/branches/${branchId}/menu`);
  return data.data;
}

/** Placeholder until order API exists — returns a fake order id. */
export async function placeOrder(payload) {
  if (USE_MOCK) {
    await delay(400);
    return {
      _id: `order-${Date.now()}`,
      status: 'placed',
      ...payload,
      createdAt: new Date().toISOString(),
    };
  }
  const { data } = await api.post('/orders', payload);
  return data.data;
}

/** Placeholder tracking until order API exists. */
export async function getOrder(orderId) {
  if (USE_MOCK) {
    await delay();
    return {
      _id: orderId,
      status: 'preparing',
      estimatedMinutes: 25,
      timeline: [
        { status: 'placed', at: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
        { status: 'preparing', at: new Date().toISOString() },
      ],
    };
  }
  const { data } = await api.get(`/orders/${orderId}`);
  return data.data;
}
