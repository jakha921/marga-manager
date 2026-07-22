import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { paymentsService, AdminPlanConfig } from '../../api/services/payments';
import { useLanguage } from '../../context/LanguageContext';
import { formatNumber } from '../../utils';

// Черновики строк редактируются в UZS; в API цена уходит в тийинах (×100)
interface DraftRow {
  priceUzs: string;
  maxKitchens: string;
  maxUsers: string;
  isActive: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '110px',
  padding: '8px 10px',
  borderRadius: 6,
  background: '#0f172a',
  border: '1px solid #334155',
  color: '#f1f5f9',
  fontSize: 14,
  fontFamily: 'monospace',
};

const PlanConfigPage: React.FC = () => {
  const { t } = useLanguage();
  const [configs, setConfigs] = useState<AdminPlanConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data } = await paymentsService.getPlanConfigs();
      setConfigs(data);
      setDrafts(Object.fromEntries(data.map(c => [c.id, {
        priceUzs: String(c.priceUzs),
        maxKitchens: String(c.maxKitchens),
        maxUsers: String(c.maxUsers),
        isActive: c.isActive,
      }])));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const setDraft = (id: number, patch: Partial<DraftRow>) =>
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleSave = async (cfg: AdminPlanConfig) => {
    const draft = drafts[cfg.id];
    if (!draft || savingId) return;
    const priceUzs = parseInt(draft.priceUzs.replace(/\s/g, ''), 10);
    const maxKitchens = parseInt(draft.maxKitchens, 10);
    const maxUsers = parseInt(draft.maxUsers, 10);
    if ([priceUzs, maxKitchens, maxUsers].some(n => isNaN(n) || n < 0)) {
      setMessage('Проверьте значения: нужны неотрицательные числа.');
      return;
    }
    setSavingId(cfg.id);
    setMessage('');
    try {
      await paymentsService.updatePlanConfig(cfg.id, {
        price: priceUzs * 100,
        maxKitchens,
        maxUsers,
        isActive: draft.isActive,
      });
      await fetchConfigs();
      setMessage(`${cfg.plan}: сохранено. Лендинг и биллинг увидят новую цену сразу.`);
    } catch {
      setMessage(`${cfg.plan}: не удалось сохранить. Попробуйте ещё раз.`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: '32px 40px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{t('admin.plans_tab')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24, maxWidth: 560 }}>
          Цены и лимиты тарифов. Изменения применяются к новым подпискам и продлениям;
          лимиты существующих организаций обновятся при следующей оплате.
        </p>

        {message && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 14,
            background: message.includes('не удалось') || message.includes('Проверьте') ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
            color: message.includes('не удалось') || message.includes('Проверьте') ? '#f87171' : '#4ade80',
          }}>
            {message}
          </div>
        )}

        {loading ? (
          <div style={{ color: '#64748b', padding: 40 }}>Loading…</div>
        ) : (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Тариф', 'Цена (UZS/мес)', 'Кухни', 'Пользователи', 'Активен', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #334155' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {configs.map(cfg => {
                  const draft = drafts[cfg.id];
                  if (!draft) return null;
                  return (
                    <tr key={cfg.id}>
                      <td style={{ padding: '12px', borderBottom: '1px solid #273244', fontWeight: 700 }}>{cfg.plan}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #273244' }}>
                        <input
                          style={{ ...inputStyle, width: '140px' }}
                          value={draft.priceUzs}
                          onChange={e => setDraft(cfg.id, { priceUzs: e.target.value.replace(/[^0-9\s]/g, '') })}
                        />
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                          сейчас: {formatNumber(cfg.priceUzs)}
                        </div>
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #273244' }}>
                        <input
                          style={{ ...inputStyle, width: '70px' }}
                          value={draft.maxKitchens}
                          onChange={e => setDraft(cfg.id, { maxKitchens: e.target.value.replace(/\D/g, '') })}
                        />
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #273244' }}>
                        <input
                          style={{ ...inputStyle, width: '70px' }}
                          value={draft.maxUsers}
                          onChange={e => setDraft(cfg.id, { maxUsers: e.target.value.replace(/\D/g, '') })}
                        />
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #273244' }}>
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          onChange={e => setDraft(cfg.id, { isActive: e.target.checked })}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #273244' }}>
                        <button
                          onClick={() => handleSave(cfg)}
                          disabled={savingId === cfg.id}
                          style={{ padding: '8px 18px', borderRadius: 8, background: '#38bdf8', color: '#0f172a', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                        >
                          {savingId === cfg.id ? '…' : 'Сохранить'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PlanConfigPage;
