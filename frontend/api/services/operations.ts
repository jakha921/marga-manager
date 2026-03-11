import apiClient from '../client';

export const operationsService = {
  getAll: (params?: Record<string, string>) => apiClient.get('/operations/', { params }),
  getById: (id: string | number) => apiClient.get(`/operations/${id}/`),
  create: (data: Record<string, unknown>) => apiClient.post('/operations/', data),
  update: (id: string | number, data: Record<string, unknown>) => apiClient.patch(`/operations/${id}/`, data),
  delete: (id: string | number) => apiClient.delete(`/operations/${id}/`),
  getLastIncoming: (productId: string | number) =>
    apiClient.get(`/operations/last-incoming/${productId}/`),
};
