import apiClient from '../client';

export interface RegisterData {
  organizationName: string;
  ownerName: string;
  phone: string;
  password: string;
}

export const authService = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/login/', { username, password }),
  register: (data: RegisterData) =>
    apiClient.post('/auth/register/', data),
  refresh: (refresh: string) =>
    apiClient.post('/auth/refresh/', { refresh }),
  getMe: () => apiClient.get('/auth/me/'),
  // Публичная заявка на сброс пароля
  requestPasswordReset: (phone: string, note: string) =>
    apiClient.post('/auth/password-reset-request/', { phone, note }),
  // Админ: заявки и их обработка
  listResetRequests: (params?: Record<string, string>) =>
    apiClient.get('/auth/password-reset-requests/', { params }),
  resolveResetRequest: (id: number, newPassword: string) =>
    apiClient.post(`/auth/password-reset-requests/${id}/resolve/`, { new_password: newPassword }),
};
