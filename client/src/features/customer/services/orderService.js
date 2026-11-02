// client/src/modules/customer/services/orderService.js
// Orders belong to Member 3. The client sends WHAT was ordered (item ids and
// quantities). The server must look up prices itself and return the totals.
import api from '../../../api/axios';
import { USE_MOCK, ENDPOINTS } from '../config';
import { mockPlaceOrder, mockGetMyOrders, mockGetOrder } from '../mock/mockBackend';

export const placeOrder = async (payload) =>
  USE_MOCK ? mockPlaceOrder(payload) : (await api.post(ENDPOINTS.orders, payload)).data.data;

export const getMyOrders = async () =>
  USE_MOCK ? mockGetMyOrders() : (await api.get(ENDPOINTS.myOrders)).data.data;

export const getOrder = async (id) =>
  USE_MOCK ? mockGetOrder(id) : (await api.get(ENDPOINTS.order(id))).data.data;
