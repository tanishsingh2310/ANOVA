// client/src/modules/customer/services/adminCouponService.js
// Staff coupon management. Always uses the REAL API (never demo data), because it
// changes real coupons. Branches come from Member 1's API; if that is not ready the
// page falls back to "all branches".
import api from '../../../api/axios';
import { ENDPOINTS } from '../config';

export const listCoupons = async () => (await api.get('/coupons', { params: { limit: 100 } })).data.data.items;
export const createCoupon = async (body) => (await api.post('/coupons', body)).data.data;
export const updateCoupon = async (id, body) => (await api.put(`/coupons/${id}`, body)).data.data;
export const deleteCoupon = async (id) => (await api.delete(`/coupons/${id}`)).data;
export const listBranchesForAdmin = async () => (await api.get(ENDPOINTS.branches)).data.data;
