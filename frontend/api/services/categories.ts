import apiClient from '../client';

export const categoriesService = {
  getAll: (params?: Record<string, string>) => apiClient.get('/categories/', { params }),
  getById: (id: string | number) => apiClient.get(`/categories/${id}/`),
  create: (data: Record<string, unknown>) => apiClient.post('/categories/', data),
  update: (id: string | number, data: Record<string, unknown>) => apiClient.patch(`/categories/${id}/`, data),
  delete: (id: string | number) => apiClient.delete(`/categories/${id}/`),
};
