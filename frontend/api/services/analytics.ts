import apiClient from '../client';

export const analyticsService = {
  getKitchenReport: (params: Record<string, string>) =>
    apiClient.get('/analytics/kitchen-report/', { params }),
  getKitchenReportXlsx: (params: Record<string, string>) =>
    apiClient.get('/analytics/kitchen-report/', {
      params: { ...params, output: 'xlsx' },
      responseType: 'blob',
    }),
  getOperationsSummary: (params?: Record<string, string>) =>
    apiClient.get('/analytics/operations-summary/', { params }),
  getSalesChart: (params: Record<string, string>) =>
    apiClient.get<{ series: { date: string; sales: number; purchases: number }[] }>(
      '/analytics/sales-chart/',
      { params }
    ),
  getProductConsumption: (productId: string | number, params: Record<string, string>) =>
    apiClient.get<{ series: { date: string; value: number }[] }>(
      `/analytics/product-consumption/${productId}/`,
      { params }
    ),
};
