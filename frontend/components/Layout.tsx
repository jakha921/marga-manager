
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusSquare, ChefHat, Package, Menu, Settings, LogOut, Globe, Sun, Moon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatDate } from '../utils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const { logout, userRole } = useAuth();
  const { theme, toggleTheme } = useTheme();

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'TENANT_ADMIN'] },
    { path: '/quick-input', label: t('nav.quick_input'), icon: PlusSquare, roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'KITCHEN_USER'] },
    { path: '/kitchens', label: t('nav.kitchens'), icon: ChefHat, roles: ['SUPER_ADMIN', 'TENANT_ADMIN'] },
    { path: '/products', label: t('nav.products'), icon: Package, roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'KITCHEN_USER'] },
  ];

  const exploreItems = [
    { path: '/settings', label: t('nav.settings'), icon: Settings, roles: ['SUPER_ADMIN', 'TENANT_ADMIN'] }, 
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(userRole || ''));
  const visibleExploreItems = exploreItems.filter(item => item.roles.includes(userRole || ''));

  const getLinkClasses = ({ isActive }: { isActive: boolean }) => `
    flex items-center gap-3 px-4 py-2.5 mx-3 rounded-xl
    font-display text-[13px] font-medium tracking-wide
    transition-all duration-200
    ${isActive
      ? 'bg-[var(--color-primary)] text-[var(--bg-surface)] shadow-md'
      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]'}
  `;

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return t('nav.dashboard');
      case '/quick-input': return t('nav.quick_input');
      case '/kitchens': return t('nav.kitchens');
      case '/products': return t('nav.products');
      case '/reports': return t('nav.reports');
      case '/settings': return t('nav.settings');
      default: return 'Overview';
    }
  };

  const handleLanguageChange = () => {
    if (language === 'en') setLanguage('ru');
    else if (language === 'ru') setLanguage('uz');
    else setLanguage('en');
  };

  const getFormattedDate = () => {
    return formatDate(new Date());
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex font-body selection:bg-emerald-100 selection:text-emerald-900">
      {/* Sidebar (Desktop) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[var(--bg-surface)] border-r border-[var(--border-color)] transform transition-transform duration-300 ease-out flex flex-col
        lg:translate-x-0 lg:static lg:block
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-24 flex items-center px-8 border-b border-transparent">
          <div className="flex items-center gap-3 text-[var(--text-primary)]">
            <div className="w-9 h-9 bg-[var(--color-primary)] rounded-xl flex items-center justify-center text-[var(--bg-surface)] font-bold font-display text-sm shadow-lg shadow-[var(--color-primary)]/20">
              MM
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight block leading-none">MARGA</span>
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider block mt-0.5">MANAGER</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-8 sidebar-scroll">
          <div className="px-8 mb-3 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            {t('nav.main_menu')}
          </div>
          <nav className="flex flex-col gap-1 mb-10">
            {visibleNavItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={getLinkClasses}>
                {({ isActive }) => (
                  <>
                    <item.icon size={18} className={isActive ? "text-[var(--bg-surface-2)]" : "text-[var(--text-muted)]"} strokeWidth={2} />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {visibleExploreItems.length > 0 && (
            <>
              <div className="px-8 mb-3 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {t('nav.explore')}
              </div>
              <nav className="flex flex-col gap-1">
                {visibleExploreItems.map((item) => (
                  <NavLink key={item.path} to={item.path} className={getLinkClasses}>
                    {({ isActive }) => (
                      <>
                        <item.icon size={18} className={isActive ? "text-[var(--bg-surface-2)]" : "text-[var(--text-muted)]"} strokeWidth={2} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </>
          )}
        </div>

        <div className="p-6 border-t border-[var(--border-light)]">
          <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 transition-colors text-[13px] font-medium">
            <LogOut size={18} strokeWidth={2} />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-24 px-8 flex items-center justify-between flex-shrink-0 bg-[var(--bg-primary)]">
          <div>
             {/* Mobile Menu Button */}
             <div className="lg:hidden flex items-center gap-3 mb-2">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-[var(--text-secondary)]">
                  <Menu size={24} />
                </button>
                <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center text-[var(--bg-surface)] font-bold text-xs">MM</div>
             </div>
             
             <h1 className="font-display font-bold text-2xl text-[var(--text-primary)] tracking-tight">
               {getPageTitle()}
             </h1>
             <p className="text-[var(--text-muted)] text-xs font-medium mt-1">
               {getFormattedDate()}
             </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)] transition-colors shadow-sm"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              onClick={handleLanguageChange}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] rounded-full shadow-sm border border-[var(--border-color)] hover:border-[var(--text-muted)] transition-colors group"
            >
               <Globe size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]" />
               <span className="text-xs font-bold text-[var(--text-secondary)] uppercase w-4 text-center">{language}</span>
            </button>

            <div className="flex items-center gap-3 pl-3 border-l border-[var(--border-color)]">
              <div className="text-right hidden md:block">
                <div className="text-[13px] font-bold text-[var(--text-primary)] leading-tight">{t('header.greeting')}</div>
                <div className="text-[11px] font-medium text-[var(--text-muted)]">{t('header.role')}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] text-[var(--bg-surface)] flex items-center justify-center text-xs font-bold shadow-md shadow-[var(--color-primary)]/10">
                JP
              </div>
            </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-0">
          <div className="max-w-7xl mx-auto pb-10">
            {children}
          </div>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-[var(--color-primary)]/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

export default Layout;
