
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusSquare, ChefHat, Package, Menu, Settings, HelpCircle, LogOut, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const { logout, userRole } = useAuth();

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
      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
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
    <div className="min-h-screen bg-[#F8FAFC] flex font-body selection:bg-emerald-100 selection:text-emerald-900">
      {/* Sidebar (Desktop) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/60 transform transition-transform duration-300 ease-out flex flex-col
        lg:translate-x-0 lg:static lg:block
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-24 flex items-center px-8 border-b border-transparent">
          <div className="flex items-center gap-3 text-slate-900">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold font-display text-sm shadow-lg shadow-slate-900/20">
              MM
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight block leading-none">MARGA</span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mt-0.5">MENEGER</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-8 sidebar-scroll">
          <div className="px-8 mb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {t('nav.main_menu')}
          </div>
          <nav className="flex flex-col gap-1 mb-10">
            {visibleNavItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={getLinkClasses}>
                {({ isActive }) => (
                  <>
                    <item.icon size={18} className={isActive ? "text-slate-200" : "text-slate-400"} strokeWidth={2} />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {visibleExploreItems.length > 0 && (
            <>
              <div className="px-8 mb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t('nav.explore')}
              </div>
              <nav className="flex flex-col gap-1">
                {visibleExploreItems.map((item) => (
                  <NavLink key={item.path} to={item.path} className={getLinkClasses}>
                    {({ isActive }) => (
                      <>
                        <item.icon size={18} className={isActive ? "text-slate-200" : "text-slate-400"} strokeWidth={2} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-50">
          <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors text-[13px] font-medium">
            <LogOut size={18} strokeWidth={2} />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-24 px-8 flex items-center justify-between flex-shrink-0 bg-[#F8FAFC]">
          <div>
             {/* Mobile Menu Button */}
             <div className="lg:hidden flex items-center gap-3 mb-2">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600">
                  <Menu size={24} />
                </button>
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xs">MM</div>
             </div>
             
             <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight">
               {getPageTitle()}
             </h1>
             <p className="text-slate-400 text-xs font-medium mt-1">
               {getFormattedDate()}
             </p>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={handleLanguageChange}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-sm border border-slate-200 hover:border-slate-300 transition-colors group"
            >
               <Globe size={16} className="text-slate-400 group-hover:text-slate-600" />
               <span className="text-xs font-bold text-slate-600 uppercase w-4 text-center">{language}</span>
            </button>

            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <div className="text-[13px] font-bold text-slate-900 leading-tight">{t('header.greeting')}</div>
                <div className="text-[11px] font-medium text-slate-400">{t('header.role')}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-slate-900/10">
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
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

export default Layout;
