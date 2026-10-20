// client/src/modules/customer/services/couponService.js
// Customer-facing coupon calls. The discount shown here is a PREVIEW; the order
// recalculates it on the server. Real mode talks to Member 4's own /api/coupons.
import api from '../../../api/axios';
import { USE_MOCK } from '../config';
import { mockValidateCoupon, mockGetOffers } from '../mock/mockBackend';

// body: { code, branch, subtotal }  returns: { code, title, discount }
export const validateCoupon = async (body) =>
  USE_MOCK ? mockValidateCoupon(body) : (await api.post('/coupons/validate', body)).data.data;

export const getOffers = async (branchId) =>
  USE_MOCK
    ? mockGetOffers(branchId)
    : (await api.get('/coupons/offers', { params: branchId ? { branch: branchId } : {} })).data.data;
