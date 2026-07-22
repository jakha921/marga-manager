import React, { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import auditLogsService from '../../api/services/auditLogs';
import type { AuditLogEntry } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';

const EVENT_COLORS: Record<string, string> = {
  PLAN_CHANGE: '#818cf8',
  PLAN_REVERT: '#94a3b8',
  ORDER_STATE_CHANGE: '#38bdf8',
  TXN_STATE_CHANGE: '#22d3ee',
  KITCHEN_CREATED: '#22c55e',
  KITCHEN_UPDATED: '#a3e635',
  KITCHEN_DELETED: '#ef4444',
  PRODUCT_CREATED: '#4ade80',
  PRODUCT_UPDATED: '#86efac',
  PRODUCT_DELETED: '#f87171',
  USER_CREATED: '#60a5fa',
  USER_UPDATED: '#93c5fd',
  USER_DELETED: '#f87171',
  ORG_SUSPENDED: '#fb923c',
  ORG_UNSUSPENDED: '#34d399',
  ORG_DELETED: '#ef4444',
};

const AuditLogPage: React.FC = () => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filterEvent, setFilterEvent] = useState('');
  const [filterOrg, setFilterOrg] = useState('');
  const { organizations } = useData();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditLogsService.getAll({
        ...(filterEvent ? { eventType: filterEvent } : {}),
        ...(filterOrg ? { organization: filterOrg } : {}),
        page,
      });
      setLogs(res.data.results);
      setCount(res.data.count);
    } finally {
      setLoading(false);
    }
  }, [page, filterEvent, filterOrg]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(count / 20);

  return (
    <AdminLayout>
      <div style={{ padding: '32px 40px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>{t('admin.audit_log')}</h1>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <select
            value={filterEvent}
            onChange={e => { setFilterEvent(e.target.value); setPage(1); }}
            style={{ padding: '8px 12px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 14 }}
          >
            <option value="">{t('admin.audit.all_events')}</option>
            {Object.keys(EVENT_COLORS).map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <select
            value={filterOrg}
            onChange={e => { setFilterOrg(e.target.value); setPage(1); }}
            style={{ padding: '8px 12px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 14 }}
          >
            <option value="">{t('admin.audit.all_orgs')}</option>
            {organizations.map(o => (
              <option key={o.id} value={String(o.id)}>{o.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ color: '#64748b', padding: 40 }}>Loading…</div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Time', t('admin.event_type'), t('admin.actor'), 'Org', t('admin.target'), t('admin.old_value'), t('admin.new_value')].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#64748b', fontSize: 12, borderBottom: '1px solid #334155' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '8px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('ru-RU')}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: `${EVENT_COLORS[log.eventType] ?? '#94a3b8'}20`,
                        color: EVENT_COLORS[log.eventType] ?? '#94a3b8',
                      }}>
                        {log.eventType}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{log.actorName ?? '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{log.orgName ?? '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{log.targetType} #{log.targetId}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {Object.keys(log.oldValue).length ? JSON.stringify(log.oldValue) : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {Object.keys(log.newValue).length ? JSON.stringify(log.newValue) : '—'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 24, color: '#64748b', textAlign: 'center' }}>No records</td></tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 14px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>←</button>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>Page {page} of {totalPages} ({count} total)</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 14px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>→</button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AuditLogPage;
