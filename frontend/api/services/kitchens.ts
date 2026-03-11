import apiClient from '../client';

export const kitchensService = {
  getAll: (params?: Record<string, string>) => apiClient.get('/kitchens/', { params }),
  getById: (id: string | number) => apiClient.get(`/kitchens/${id}/`),
  create: (data: Record<string, unknown>) => apiClient.post('/kitchens/', data),
  update: (id: string | number, data: Record<string, unknown>) => apiClient.patch(`/kitchens/${id}/`, data),
  delete: (id: string | number) => apiClient.delete(`/kitchens/${id}/`),
};
