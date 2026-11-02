// client/src/modules/customer/services/adminFeedbackService.js
// Staff side of reviews and complaints. The backend decides who may do what.
import api from '../../../api/axios';
import { USE_MOCK, ENDPOINTS } from '../config';
import * as mock from '../mock/mockBackend';

export const listReviews = async ({ low, hidden } = {}) =>
  USE_MOCK ? mock.mockListReviews({ low, hidden })
    : (await api.get(ENDPOINTS.reviews, { params: { low: low || undefined, hidden: hidden || undefined } })).data.data;
export const moderateReview = async (id, body) =>
  USE_MOCK ? mock.mockModerateReview(id, body) : (await api.patch(`${ENDPOINTS.reviews}/${id}`, body)).data.data;

export const listComplaints = async ({ status } = {}) =>
  USE_MOCK ? mock.mockListComplaints({ status })
    : (await api.get(ENDPOINTS.complaints, { params: status ? { status } : {} })).data.data;
export const updateComplaint = async (id, body) =>
  USE_MOCK ? mock.mockUpdateComplaint(id, body) : (await api.patch(`${ENDPOINTS.complaints}/${id}`, body)).data.data;
