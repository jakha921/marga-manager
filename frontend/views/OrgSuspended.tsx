import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const OrgSuspended: React.FC = () => {
  const { logout } = useAuth();
  const { t } = useLanguage();

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', display: 'flex',
      alignItems: 'center', justifyContent: 'center', color: '#f1f5f9',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          {t('admin.org_suspended')}
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: 24 }}>
          Обратитесь к администратору платформы.
        </p>
        <button
          onClick={logout}
          style={{
            padding: '10px 24px', borderRadius: 8, background: '#38bdf8',
            color: '#0f172a', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}
        >
          Выйти
        </button>
      </div>
    </div>
  );
};

export default OrgSuspended;
