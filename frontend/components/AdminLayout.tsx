import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, ClipboardList, CreditCard, KeyRound, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { logout, username } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { to: '/admin', label: 'Organizations', icon: Building2 },
    { to: '/admin/plans', label: t('admin.plans_tab'), icon: CreditCard },
    { to: '/admin/password-resets', label: t('resets.nav'), icon: KeyRound },
    { to: '/admin/audit-log', label: t('admin.audit_log'), icon: ClipboardList },
  ];

  const sidebarContent = (
    <>
      <div className="border-b border-slate-700 px-5 pb-6">
        <div className="text-lg font-bold text-slate-100">Marga Admin</div>
        <div className="mt-1 text-xs text-slate-500">{username}</div>
      </div>
      <nav className="flex-1 px-2 py-4">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = item.to === '/admin'
            ? location.pathname === '/admin' || location.pathname.startsWith('/admin/organizations/')
            : location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={`mb-1 flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 text-sm no-underline ${
                isActive ? 'bg-sky-400/10 font-semibold text-sky-400' : 'font-normal text-slate-400'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-700 px-2 pt-4">
        <button
          onClick={logout}
          className="flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-3 text-sm text-slate-400"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* Десктопный сайдбар */}
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-slate-700 bg-slate-800 py-6 md:flex">
        {sidebarContent}
      </aside>

      {/* Мобильный drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[240px] flex-col border-r border-slate-700 bg-slate-800 py-6">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Мобильная шапка */}
        <header className="flex items-center gap-3 border-b border-slate-700 bg-slate-800 px-4 py-3 md:hidden">
          <button
            onClick={() => setMenuOpen(open => !open)}
            aria-label="Menu"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-slate-300"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="text-base font-bold text-slate-100">Marga Admin</div>
        </header>

        <main className="min-w-0 flex-1 overflow-auto text-slate-100">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
