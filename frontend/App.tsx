
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import QuickInput from './views/QuickInput';
import Kitchens from './views/Kitchens';
import Products from './views/Products';
import Settings from './views/Settings';
import Reports from './views/Reports'; // Still imported if needed later, or can be removed, but user only asked to hide. I'll leave import for now but remove route.
import Login from './views/Login';
import AdminDashboard from './views/superadmin/AdminDashboard';
import { DataProvider } from './context/DataContext';
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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <DataProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              {/* Super Admin Routes */}
              <Route path="/admin/*" element={
                <SuperAdminRoute>
                   <Routes>
                      <Route path="/" element={<AdminDashboard />} />
                   </Routes>
                </SuperAdminRoute>
              } />

              {/* Tenant Client Routes */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <Layout>
                    <TenantRoutes />
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
          </HashRouter>
        </DataProvider>
      </LanguageProvider>
    </AuthProvider>
  );
};

const TenantRoutes: React.FC = () => {
  const { userRole } = useAuth();
  
  if (userRole === 'KITCHEN_USER') {
    return (
      <Routes>
        <Route path="/quick-input" element={<QuickInput />} />
        <Route path="/products" element={<Products />} />
        <Route path="*" element={<Navigate to="/quick-input" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/quick-input" element={<QuickInput />} />
      <Route path="/kitchens" element={<Kitchens />} />
      <Route path="/products" element={<Products />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
