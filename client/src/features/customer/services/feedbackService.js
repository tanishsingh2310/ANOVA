// client/src/modules/customer/services/feedbackService.js
// Customer-facing reviews and complaints. Demo mode keeps them in the browser.
import api from '../../../api/axios';
import { USE_MOCK, ENDPOINTS } from '../config';
import * as mock from '../mock/mockBackend';

// body: { order, foodRating, deliveryRating?, comment? }
export const createReview = async (body) =>
  USE_MOCK ? mock.mockCreateReview(body) : (await api.post(ENDPOINTS.reviews, body)).data.data;
export const getMyReviews = async () =>
  USE_MOCK ? mock.mockMyReviews() : (await api.get(`${ENDPOINTS.reviews}/mine`)).data.data;
// [{ branch, average, count }]
export const getReviewSummary = async () =>
  USE_MOCK ? mock.mockReviewSummary() : (await api.get(`${ENDPOINTS.reviews}/summary`)).data.data;

// body: { subject, description?, category?, order? }
export const createComplaint = async (body) =>
  USE_MOCK ? mock.mockCreateComplaint(body) : (await api.post(ENDPOINTS.complaints, body)).data.data;
export const getMyComplaints = async () =>
  USE_MOCK ? mock.mockMyComplaints() : (await api.get(`${ENDPOINTS.complaints}/mine`)).data.data;
