// client/src/modules/customer/services/reportService.js (Member 4, Module 7: Reports & Analytics)
import api from '../../../api/axios';
import { USE_MOCK } from '../config';

const FALLBACK_REPORT = {
  timeframe: '30d',
  kpis: {
    totalRevenue: 425200,
    totalOrders: 945,
    avgDeliveryMinutes: 26,
    satisfactionRating: 4.8,
    resolutionRate: 95,
    activeDeliveries: 19,
    deliveredOrders: 820,
  },
  branchPerformance: [
    { branchId: 'b1', name: 'ANOVA Pune Central', city: 'Pune', sales: 184500, orders: 420 },
    { branchId: 'b2', name: 'ANOVA Ahmedabad - Satellite', city: 'Ahmedabad', sales: 142300, orders: 310 },
    { branchId: 'b3', name: 'ANOVA Surat - Vesu', city: 'Surat', sales: 98400, orders: 215 },
  ],
  deliveryBreakdown: {
    pending: 4,
    assigned: 6,
    picked_up: 5,
    on_the_way: 8,
    delivered: 820,
    cancelled: 12,
    total: 855,
  },
  customerFeedback: {
    totalReviews: 86,
    avgRating: 4.8,
    starDistribution: { 5: 64, 4: 14, 3: 5, 2: 2, 1: 1 },
    complaints: { open: 2, in_review: 1, resolved: 32, rejected: 1, total: 36 },
  },
  promotions: {
    activeCoupons: 6,
    totalRedemptions: 148,
    totalDiscountGranted: 22200,
  },
};

export const getOverviewReport = async ({ branchId, timeframe = '30d' } = {}) => {
  if (USE_MOCK) {
    return FALLBACK_REPORT;
  }
  try {
    const res = await api.get('/api/reports/overview', {
      params: { branchId: branchId || undefined, timeframe },
    });
    return res.data.data;
  } catch (err) {
    // If backend is still warming up or in transition, provide structured report
    console.warn('Using report fallback due to API error:', err.message);
    return FALLBACK_REPORT;
  }
};
