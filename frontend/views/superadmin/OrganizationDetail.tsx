import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { organizationsService } from '../../api/services/organizations';
import { paymentsService } from '../../api/services/payments';
import AdminLayout from '../../components/AdminLayout';
import type { OrganizationDetail as OrgDetailType, SubscriptionOrder } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { formatNumber } from '../../utils';

type TabKey = 'info' | 'kitchens' | 'products' | 'users' | 'payments' | 'edit';

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'info', labelKey: 'Info' },
  { key: 'kitchens', labelKey: 'admin.kitchens_tab' },
  { key: 'products', labelKey: 'admin.products_tab' },
  { key: 'users', labelKey: 'admin.users_tab' },
  { key: 'payments', labelKey: 'admin.payments_tab' },
  { key: 'edit', labelKey: 'admin.edit_tab' },
];

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span style={{
    padding: '2px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    background: status === 'ACTIVE' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
    color: status === 'ACTIVE' ? '#22c55e' : '#ef4444',
  }}>
    {status}
  </span>
);

const OrganizationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [org, setOrg] = useState<OrgDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [extending, setExtending] = useState(false);

  const fetchOrg = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await organizationsService.getDetail(id);
      setOrg(res.data);
      setEditForm(res.data as unknown as Record<string, unknown>);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrg(); }, [id]);

  useEffect(() => {
    if (activeTab === 'payments' && id) {
      paymentsService.getOrders({ organization: id, page_size: '50' })
        .then(res => setOrders(res.data.results || []))
        .catch(() => setOrders([]));
    }
  }, [activeTab, id]);

  const handleExtend = async () => {
    if (!id || extending) return;
    if (!confirm(`Продлить подписку «${org?.name}» на 30 дней?`)) return;
    setExtending(true);
    try {
      await organizationsService.extendSubscription(id, 30);
      await fetchOrg();
    } finally {
      setExtending(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await organizationsService.update(id, editForm);
      await fetchOrg();
      setSaveMsg('Saved!');
    } catch {
      setSaveMsg('Error saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ padding: 40, color: '#94a3b8' }}>Loading…</div>
    </AdminLayout>
  );

  if (!org) return (
    <AdminLayout>
      <div style={{ padding: 40, color: '#ef4444' }}>Organization not found.</div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div style={{ padding: '32px 40px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Link to="/admin" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>← Organizations</Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{org.name}</h1>
          <StatusBadge status={org.status} />
          <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
            {org.plan}
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #334155', marginBottom: 24 }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #38bdf8' : '2px solid transparent',
                color: activeTab === tab.key ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: activeTab === tab.key ? 600 : 400,
              }}
            >
              {t(tab.labelKey) || tab.labelKey.replace('admin.', '').replace('_tab', '')}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              ['Contact', org.contactName], ['Phone', org.phone], ['Email', org.email],
              ['Address', org.address], ['Kitchens', String(org.kitchensCount ?? 0)],
              ['Users', String(org.usersCount ?? 0)], ['Products', String(org.productsCount)],
              ['Operations', String(org.operationsCount)],
              ['Plan expires', org.planExpiresAt ? new Date(org.planExpiresAt).toLocaleDateString() : '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ background: '#1e293b', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 15 }}>{value || '—'}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'kitchens' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ID', 'Name', 'Active'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontSize: 12, borderBottom: '1px solid #334155' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(org.kitchens || []).map(k => (
                <tr key={k.id}>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1e293b' }}>{k.id}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1e293b' }}>{k.name}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1e293b' }}>{k.isActive ? '✓' : '—'}</td>
                </tr>
              ))}
              {(org.kitchens || []).length === 0 && (
                <tr><td colSpan={3} style={{ padding: 16, color: '#64748b' }}>No kitchens</td></tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'products' && (
          <div style={{ background: '#1e293b', borderRadius: 8, padding: 24 }}>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{org.productsCount}</div>
            <div style={{ color: '#64748b', marginTop: 4 }}>Total products</div>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={{ background: '#1e293b', borderRadius: 8, padding: 24 }}>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{org.usersCount ?? 0}</div>
            <div style={{ color: '#64748b', marginTop: 4 }}>Total users</div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ background: '#1e293b', borderRadius: 8, padding: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
              <div>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>Plan: <strong style={{ color: '#f1f5f9' }}>{org.plan}</strong></div>
                <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>
                  Expires: <strong style={{ color: '#f1f5f9' }}>{org.planExpiresAt ? new Date(org.planExpiresAt).toLocaleDateString('ru-RU') : '—'}</strong>
                </div>
              </div>
              <button
                onClick={handleExtend}
                disabled={extending}
                style={{ padding: '10px 20px', borderRadius: 8, background: '#22c55e', color: '#0f172a', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
              >
                {extending ? '…' : '+30 дней'}
              </button>
            </div>

            <div style={{ background: '#1e293b', borderRadius: 8, padding: 16, overflowX: 'auto' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Заказы</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    {['Дата', 'План', 'Сумма (UZS)', 'Статус'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#64748b', fontSize: 12, borderBottom: '1px solid #334155' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #273244', whiteSpace: 'nowrap' }}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('ru-RU') : '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #273244' }}>{o.targetPlan}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #273244', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{formatNumber(Math.round((o.amount || 0) / 100))}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #273244' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                          background: o.status === 'PAID' ? 'rgba(34,197,94,0.15)' : o.status === 'PENDING' ? 'rgba(234,179,8,0.15)' : 'rgba(148,163,184,0.15)',
                          color: o.status === 'PAID' ? '#22c55e' : o.status === 'PENDING' ? '#eab308' : '#94a3b8',
                        }}>{o.status}</span>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: 14, color: '#64748b' }}>Заказов пока нет</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'edit' && (
          <div style={{ maxWidth: 520 }}>
            {[
              { key: 'name', label: 'Name', type: 'text' },
              { key: 'contactName', label: 'Contact Name', type: 'text' },
              { key: 'phone', label: 'Phone', type: 'text' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'address', label: 'Address', type: 'text' },
              { key: 'maxKitchens', label: 'Max Kitchens', type: 'number' },
              { key: 'maxUsers', label: 'Max Users', type: 'number' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>{field.label}</label>
                <input
                  type={field.type}
                  value={String(editForm[field.key] ?? '')}
                  onChange={e => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Status</label>
              <select
                value={String(editForm.status ?? '')}
                onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 14 }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Plan</label>
              <select
                value={String(editForm.plan ?? '')}
                onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 14 }}
              >
                <option value="BASIC">BASIC</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 24px', borderRadius: 8, background: '#38bdf8', color: '#0f172a', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {saveMsg && <span style={{ marginLeft: 12, fontSize: 14, color: saveMsg === 'Saved!' ? '#22c55e' : '#ef4444' }}>{saveMsg}</span>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default OrganizationDetail;
