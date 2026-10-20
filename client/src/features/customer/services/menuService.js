// client/src/modules/customer/services/menuService.js
// Menu data belongs to Member 3. This file only READS it, one branch at a time.
import api from '../../../api/axios';
import { USE_MOCK, ENDPOINTS } from '../config';
import { mockGetMenu } from '../mock/mockBackend';

// Expected item: { _id, name, description, price, category, imageUrl?, isAvailable }
export const getMenu = async (branchId) =>
  USE_MOCK
    ? mockGetMenu(branchId)
    : (await api.get(ENDPOINTS.menu, { params: { branch: branchId } })).data.data;
