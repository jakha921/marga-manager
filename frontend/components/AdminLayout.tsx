import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { logout, username } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const navItems = [
    { to: '/admin', label: 'Organizations', icon: Building2 },
    { to: '/admin/audit-log', label: t('admin.audit_log'), icon: ClipboardList },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: '#1e293b',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        borderRight: '1px solid #334155',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Marga Admin</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{username}</div>
        </div>
        <nav style={{ flex: 1, padding: '16px 8px' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = item.to === '/admin'
              ? location.pathname === '/admin' || location.pathname.startsWith('/admin/organizations/')
              : location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  background: isActive ? 'rgba(56,189,248,0.1)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  marginBottom: 4,
                }}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: '16px 8px', borderTop: '1px solid #334155' }}>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              color: '#94a3b8',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              width: '100%',
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflow: 'auto', color: '#f1f5f9' }}>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
