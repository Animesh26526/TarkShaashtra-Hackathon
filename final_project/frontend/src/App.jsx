import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp, ROLES } from './context/AppContext';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import ComplaintList from './pages/ComplaintList';
import ComplaintDetail from './pages/ComplaintDetail';
import SubmitComplaint from './pages/SubmitComplaint';
import QADashboard from './pages/QADashboard';
import OpsExport from './pages/OpsExport';
import SLASettings from './pages/SLASettings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CompleteProfile from './pages/CompleteProfile';
import VerifyEmail from './pages/VerifyEmail';

// Protected route — requires authenticated, verified, profile-complete user
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, isVerified, hasProfile } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, margin: '0 auto', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasProfile) return <Navigate to="/complete-profile" replace />;

  return children;
};

// Role-based routing within protected area
const RoleRoute = ({ allowedRoles, children }) => {
  const { userRole } = useApp();
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const HomeRedirect = () => {
  const { userRole } = useApp();
  switch (userRole) {
    case ROLES.MANAGER: return <Navigate to="/operational-dashboard" replace />;
    case ROLES.QA: return <Navigate to="/complaints" replace />;
    case ROLES.EXECUTIVE: return <Navigate to="/submit" replace />;
    default: return <Navigate to="/complaints" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />

          {/* Protected dashboard routes */}
          <Route element={
            <ProtectedRoute>
              <AppProvider>
                <AppLayout />
              </AppProvider>
            </ProtectedRoute>
          }>
            <Route path="/" element={<HomeRedirect />} />

            {/* Customer Support Executive Action */}
            <Route path="/submit" element={
              <RoleRoute allowedRoles={[ROLES.EXECUTIVE]}>
                <SubmitComplaint />
              </RoleRoute>
            } />

            {/* Shared – QA, Manager */}
            <Route path="/complaints" element={
              <RoleRoute allowedRoles={[ROLES.QA, ROLES.MANAGER]}>
                <ComplaintList />
              </RoleRoute>
            } />
            <Route path="/complaints/:id" element={
              <RoleRoute allowedRoles={[ROLES.QA, ROLES.MANAGER]}>
                <ComplaintDetail />
              </RoleRoute>
            } />

            {/* Operations Manager */}
            <Route path="/operational-dashboard" element={
              <RoleRoute allowedRoles={[ROLES.MANAGER]}>
                <Dashboard />
              </RoleRoute>
            } />
            <Route path="/ops/sla" element={
              <RoleRoute allowedRoles={[ROLES.MANAGER]}>
                <SLASettings />
              </RoleRoute>
            } />
            <Route path="/ops/export" element={
              <RoleRoute allowedRoles={[ROLES.MANAGER]}>
                <OpsExport />
              </RoleRoute>
            } />

            {/* QA Team */}
            <Route path="/qa/review" element={
              <RoleRoute allowedRoles={[ROLES.QA]}>
                <QADashboard />
              </RoleRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
