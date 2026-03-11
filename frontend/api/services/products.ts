import apiClient from '../client';

export const productsService = {
  getAll: (params?: Record<string, string>) => apiClient.get('/products/', { params }),
  getById: (id: string | number) => apiClient.get(`/products/${id}/`),
  create: (data: Record<string, unknown>) => apiClient.post('/products/', data),
  update: (id: string | number, data: Record<string, unknown>) => apiClient.patch(`/products/${id}/`, data),
  delete: (id: string | number) => apiClient.delete(`/products/${id}/`),
};
