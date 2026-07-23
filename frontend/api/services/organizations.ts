import apiClient from '../client';
import type { OrganizationDetail } from '../../types';

export const organizationsService = {
  getAll: (params?: Record<string, string>) => apiClient.get('/organizations/', { params }),
  getDetail: (id: string | number) => apiClient.get<OrganizationDetail>(`/organizations/${id}/detail_view/`),
  create: (data: Record<string, unknown>) => apiClient.post('/organizations/', data),
  update: (id: string | number, data: Record<string, unknown>) => apiClient.patch(`/organizations/${id}/`, data),
  delete: (id: string | number) => apiClient.delete(`/organizations/${id}/`),
  extendSubscription: (id: string | number, days: number) =>
    apiClient.post<{ planExpiresAt: string; status: string }>(
      `/organizations/${id}/extend_subscription/`,
      { days }
    ),
  listWithDeleted: () =>
    apiClient.get('/organizations/', { params: { include_deleted: 'true', page_size: '500' } }),
  restore: (id: string | number) =>
    apiClient.post(`/organizations/${id}/restore/`),
};
