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
};
