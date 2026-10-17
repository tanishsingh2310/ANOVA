// client/src/modules/customer/services/customerService.js
// All Module 1 API calls live here, so pages only deal with presentation.
import api from '../../../api/axios';

export const getProfile = async () => (await api.get('/customers/me')).data.data;

export const updateProfile = async (body) => (await api.put('/customers/me', body)).data.data;

export const addAddress = async (body) =>
  (await api.post('/customers/me/addresses', body)).data.data;

export const setDefaultAddress = async (id) =>
  (await api.put(`/customers/me/addresses/${id}`, { isDefault: true })).data.data;

export const deleteAddress = async (id) =>
  (await api.delete(`/customers/me/addresses/${id}`)).data.data;
