import apiClient from '../client';

export const usersService = {
  getAll: (params?: Record<string, string>) => apiClient.get('/users/', { params }),
  getById: (id: string | number) => apiClient.get(`/users/${id}/`),
  create: (data: Record<string, unknown>) => apiClient.post('/users/', data),
  update: (id: string | number, data: Record<string, unknown>) => apiClient.patch(`/users/${id}/`, data),
  delete: (id: string | number) => apiClient.delete(`/users/${id}/`),
};
