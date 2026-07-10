
import React from 'react';
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
import Landing from './views/Landing';
import AdminDashboard from './views/superadmin/AdminDashboard';
import OrganizationDetail from './views/superadmin/OrganizationDetail';
import AuditLogPage from './views/superadmin/AuditLogPage';
import OrgSuspended from './views/OrgSuspended';
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
  const { kitchens, loading: dataLoading } = useData();

  if (loading) {
    return <div className="min-h-screen bg-[var(--bg-primary)]" />;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  if (userRole === 'SUPER_ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (userRole === 'KITCHEN_USER') {
    return <Navigate to="/quick-input" replace />;
  }

  if (userRole === 'TENANT_ADMIN' && !dataLoading && kitchens.length === 0) {
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
              
              {/* Super Admin Routes */}
              <Route path="/admin/*" element={
                <SuperAdminRoute>
                   <Routes>
                      <Route path="/" element={<AdminDashboard />} />
                      <Route path="/organizations/:id" element={<OrganizationDetail />} />
                      <Route path="/audit-log" element={<AuditLogPage />} />
                   </Routes>
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
