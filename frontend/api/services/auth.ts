import apiClient from '../client';

export const authService = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/login/', { username, password }),
  refresh: (refresh: string) =>
    apiClient.post('/auth/refresh/', { refresh }),
  getMe: () => apiClient.get('/auth/me/'),
};
