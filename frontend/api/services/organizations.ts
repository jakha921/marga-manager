import apiClient from '../client';

export const organizationsService = {
  getAll: (params?: Record<string, string>) => apiClient.get('/organizations/', { params }),
  getById: (id: string | number) => apiClient.get(`/organizations/${id}/`),
  create: (data: Record<string, unknown>) => apiClient.post('/organizations/', data),
  update: (id: string | number, data: Record<string, unknown>) => apiClient.patch(`/organizations/${id}/`, data),
  delete: (id: string | number) => apiClient.delete(`/organizations/${id}/`),
};
