import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { authService } from '../../api/services/auth';
import { useLanguage } from '../../context/LanguageContext';

interface ResetRequest {
  id: number;
  phone: string;
  note: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
  resolvedAt: string | null;
  userExists: boolean;
  userFullName: string;
}

const PasswordResetsPage: React.FC = () => {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'RESOLVED' | 'ALL'>('PENDING');
  const [pwById, setPwById] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = filter === 'ALL' ? {} : { status: filter };
      const { data } = await authService.listResetRequests(params);
      setRequests(data.results || data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const handleResolve = async (req: ResetRequest) => {
    const pw = pwById[req.id] || '';
    if (pw.length < 8) {
      setMessage(t('resets.pw_short'));
      return;
    }
    setBusyId(req.id);
    setMessage('');
    try {
      await authService.resolveResetRequest(req.id, pw);
      setMessage(t('resets.done').replace('{phone}', req.phone));
      setPwById(prev => { const n = { ...prev }; delete n[req.id]; return n; });
      fetchRequests();
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { detail?: string } } };
      setMessage(ax.response?.data?.detail || t('resets.error'));
    } finally {
      setBusyId(null);
    }
  };

  const FILTERS: { key: 'PENDING' | 'RESOLVED' | 'ALL'; label: string }[] = [
    { key: 'PENDING', label: t('resets.f_pending') },
    { key: 'RESOLVED', label: t('resets.f_resolved') },
    { key: 'ALL', label: t('resets.f_all') },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: '32px 40px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{t('resets.title')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20, maxWidth: 560 }}>
          {t('resets.subtitle')}
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                minHeight: 40, padding: '0 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: '1px solid ' + (filter === f.key ? '#38bdf8' : '#334155'),
                background: filter === f.key ? 'rgba(56,189,248,0.12)' : 'transparent',
                color: filter === f.key ? '#38bdf8' : '#94a3b8',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {message && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 14,
            background: /не|not|error|xato/i.test(message) ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
            color: /не|not|error|xato/i.test(message) ? '#f87171' : '#4ade80',
          }}>
            {message}
          </div>
        )}

        {loading ? (
          <div style={{ color: '#64748b', padding: 40 }}>Loading…</div>
        ) : requests.length === 0 ? (
          <div style={{ color: '#64748b', padding: 40, background: '#1e293b', borderRadius: 12, textAlign: 'center' }}>
            {t('resets.empty')}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {requests.map(req => (
              <div key={req.id} style={{ background: '#1e293b', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700 }}>+{req.phone}</div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
                      {req.userExists
                        ? <span style={{ color: '#4ade80' }}>{t('resets.user_found')}: {req.userFullName || '—'}</span>
                        : <span style={{ color: '#f87171' }}>{t('resets.user_missing')}</span>}
                    </div>
                    {req.note && <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>«{req.note}»</div>}
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      {new Date(req.createdAt).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  {req.status === 'RESOLVED' ? (
                    <span style={{ padding: '4px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                      {t('resets.resolved')}
                    </span>
                  ) : req.userExists ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder={t('resets.new_pw')}
                        value={pwById[req.id] || ''}
                        onChange={e => setPwById(prev => ({ ...prev, [req.id]: e.target.value }))}
                        style={{ minHeight: 40, padding: '0 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: 14, width: 200 }}
                      />
                      <button
                        onClick={() => handleResolve(req)}
                        disabled={busyId === req.id}
                        style={{ minHeight: 40, padding: '0 18px', borderRadius: 8, background: '#22c55e', color: '#0f172a', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                      >
                        {busyId === req.id ? '…' : t('resets.set_pw')}
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: '#64748b' }}>{t('resets.no_action')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PasswordResetsPage;
