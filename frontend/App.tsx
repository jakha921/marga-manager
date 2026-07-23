
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import QuickInput from './views/QuickInput';
import Kitchens from './views/Kitchens';
import Products from './views/Products';
import Settings from './views/Settings';
import Login from './views/Login';
import Register from './views/Register';
import Onboarding from './views/Onboarding';
import OrgSuspended from './views/OrgSuspended';
// Лениво: лендинг (только для гостей) и админка (только SUPER_ADMIN) —
// не грузятся обычным клиентом, уменьшают начальный бандл.
const Landing = lazy(() => import('./views/Landing'));
const AdminDashboard = lazy(() => import('./views/superadmin/AdminDashboard'));
const OrganizationDetail = lazy(() => import('./views/superadmin/OrganizationDetail'));
const AuditLogPage = lazy(() => import('./views/superadmin/AuditLogPage'));
const PlanConfigPage = lazy(() => import('./views/superadmin/PlanConfigPage'));
const PasswordResetsPage = lazy(() => import('./views/superadmin/PasswordResetsPage'));
import { DataProvider } from './context/DataContext';
import { useData } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';


const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, userRole } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If Super Admin tries to access client routes, redirect to admin
  if (userRole === 'SUPER_ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, userRole } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole !== 'SUPER_ADMIN') return <Navigate to="/" replace />; // Clients can't see admin

  return <>{children}</>;
};

const RootRoute: React.FC = () => {
  const { isAuthenticated, userRole, loading } = useAuth();
  const { kitchens, loading: dataLoading, initialized } = useData();

  if (loading) {
    return <div className="min-h-screen bg-[var(--bg-primary)]" />;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[var(--bg-primary)]" />}>
        <Landing />
      </Suspense>
    );
  }

  if (userRole === 'SUPER_ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (userRole === 'KITCHEN_USER') {
    return <Navigate to="/quick-input" replace />;
  }

  // Приостановленная организация: kitchens пуст из-за 403, это не «новый пользователь»
  if (userRole === 'TENANT_ADMIN' && localStorage.getItem('km_org_suspended') === 'true') {
    return <Navigate to="/suspended" replace />;
  }

  if (userRole === 'TENANT_ADMIN' && initialized && !dataLoading && kitchens.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <DataProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Super Admin Routes (лениво загружаемые) */}
              <Route path="/admin/*" element={
                <SuperAdminRoute>
                   <Suspense fallback={<div className="min-h-screen" style={{ background: '#0f172a' }} />}>
                     <Routes>
                        <Route path="/" element={<AdminDashboard />} />
                        <Route path="/organizations/:id" element={<OrganizationDetail />} />
                        <Route path="/plans" element={<PlanConfigPage />} />
                        <Route path="/password-resets" element={<PasswordResetsPage />} />
                        <Route path="/audit-log" element={<AuditLogPage />} />
                     </Routes>
                   </Suspense>
                </SuperAdminRoute>
              } />

              {/* Suspended org holding page */}
              <Route path="/suspended" element={<OrgSuspended />} />

              {/* Tenant Client Routes */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <Layout>
                    <TenantRoutes />
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </LanguageProvider>
    </AuthProvider>
  );
};

const TenantRoutes: React.FC = () => {
  const { userRole } = useAuth();
  const { kitchens, loading } = useData();
  const location = useLocation();
  
  if (userRole === 'KITCHEN_USER') {
    return (
      <Routes>
        <Route path="/quick-input" element={<QuickInput />} />
        <Route path="/products" element={<Products />} />
        <Route path="*" element={<Navigate to="/quick-input" replace />} />
      </Routes>
    );
  }

  if (userRole === 'TENANT_ADMIN' && !loading && kitchens.length === 0 && location.pathname !== '/onboarding') {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/quick-input" element={<QuickInput />} />
      <Route path="/kitchens" element={<Kitchens />} />
      <Route path="/products" element={<Products />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
