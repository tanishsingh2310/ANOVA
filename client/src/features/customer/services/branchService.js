// client/src/modules/customer/services/branchService.js
// Branch data belongs to Member 1. This file only READS it.
import api from '../../../api/axios';
import { USE_MOCK, ENDPOINTS } from '../config';
import { mockGetBranches } from '../mock/mockBackend';

// Expected branch: { _id, name, isActive, phone?, address: { line1, city, postalCode },
//                    operatingHours?: { open: "10:00", close: "23:00" } }
// Customers must only receive these public fields, never admin-only branch data.
export const getBranches = async () =>
  USE_MOCK ? mockGetBranches() : (await api.get(ENDPOINTS.branches)).data.data;
