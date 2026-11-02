// client/src/modules/customer/services/deliveryService.js
// Module 3 API calls. Delivery data belongs to Member 4's own /api/deliveries.
// Demo mode keeps everything in the browser so it matches the demo orders.
import api from '../../../api/axios';
import { USE_MOCK, ENDPOINTS } from '../config';
import * as mock from '../mock/mockBackend';

const base = ENDPOINTS.deliveries;

// Staff
export const listDeliveries = async ({ status } = {}) =>
  USE_MOCK ? mock.mockListDeliveries({ status })
    : (await api.get(base, { params: status ? { status } : {} })).data.data;

export const listStaff = async () =>
  USE_MOCK ? mock.mockListStaff() : (await api.get(`${base}/staff`)).data.data;

export const assignDelivery = async (id, staffId) =>
  USE_MOCK ? mock.mockAssignDelivery(id, staffId)
    : (await api.patch(`${base}/${id}/assign`, { staffId })).data.data;

export const cancelDelivery = async (id, reason) =>
  USE_MOCK ? mock.mockCancelDelivery(id, reason)
    : (await api.patch(`${base}/${id}/status`, { status: 'cancelled', reason })).data.data;

// Rider
export const getMyDeliveries = async ({ history = false } = {}) =>
  USE_MOCK ? mock.mockMyDeliveries({ history })
    : (await api.get(`${base}/mine`, { params: { history } })).data.data;

export const riderUpdateStatus = async (id, status) =>
  USE_MOCK ? mock.mockRiderUpdate(id, status)
    : (await api.patch(`${base}/${id}/status`, { status })).data.data;

// Customer: rider first name and delivery status for one of their own orders
export const getTracking = async (orderId) =>
  USE_MOCK ? mock.mockTracking(orderId) : (await api.get(`${base}/track/${orderId}`)).data.data;
