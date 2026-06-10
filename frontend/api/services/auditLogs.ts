import apiClient from '../client';
import type { AuditLogEntry } from '../../types';

interface AuditLogListResponse {
  results: AuditLogEntry[];
  count: number;
  next: string | null;
  previous: string | null;
}

const auditLogsService = {
  getAll: (params?: {
    eventType?: string;
    organization?: number;
    ordering?: string;
    page?: number;
  }) => apiClient.get<AuditLogListResponse>('/payments/audit-logs/', { params }),
};

export default auditLogsService;
