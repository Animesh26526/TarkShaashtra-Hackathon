import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp, ROLES } from './context/AppContext';
import AppLayout from './components/AppLayout';
import './styles/index.css';

import Dashboard from './pages/Dashboard';
import ComplaintList from './pages/ComplaintList';
import SubmitComplaint from './pages/SubmitComplaint';
import ComplaintDetail from './pages/ComplaintDetail';
import CustomerDashboard from './pages/CustomerDashboard';

// Automatic Redirection Manager
const RoleRedirectManager = ({ children }) => {
  const { userRole } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Track the previous role to detect changes
  const lastRoleRef = React.useRef(userRole);

  useEffect(() => {
    // Redirect on initial load if at root, or whenever the role changes
    if (location.pathname === '/' || lastRoleRef.current !== userRole) {
      lastRoleRef.current = userRole;
      if (userRole === ROLES.CUSTOMER) {
        navigate('/customer-dashboard', { replace: true });
      } else {
        navigate('/operational-dashboard', { replace: true });
      }
    }
  }, [userRole, location.pathname, navigate]);

  return children;
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { userRole } = useApp();
  
  if (!allowedRoles.includes(userRole)) {
    // Redirect unauthorized users to their respective dashboard
    if (userRole === ROLES.CUSTOMER) {
      return <Navigate to="/customer-dashboard" replace />;
    }
    return <Navigate to="/operational-dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <RoleRedirectManager>
          <Routes>
            <Route element={<AppLayout />}>
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/" replace />} />

              {/* Dashboards */}
              <Route path="/operational-dashboard" element={
                <ProtectedRoute allowedRoles={[ROLES.MANAGER, ROLES.EXECUTIVE, ROLES.QA]}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/customer-dashboard" element={
                <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                  <CustomerDashboard />
                </ProtectedRoute>
              } />

              {/* Other Pages */}
              <Route path="/complaints" element={
                <ProtectedRoute allowedRoles={[ROLES.MANAGER, ROLES.EXECUTIVE, ROLES.QA]}>
                  <ComplaintList />
                </ProtectedRoute>
              } />
              <Route path="/complaints/:id" element={
                <ProtectedRoute allowedRoles={[ROLES.MANAGER, ROLES.EXECUTIVE, ROLES.QA]}>
                  <ComplaintDetail />
                </ProtectedRoute>
              } />
              <Route path="/qa" element={
                <ProtectedRoute allowedRoles={[ROLES.QA]}>
                  <ComplaintList />
                </ProtectedRoute>
              } />
              
              {/* Legacy fallback - redirect to the new dashboard routes */}
              <Route path="/submit" element={<Navigate to="/customer-dashboard" replace />} />
            </Route>
          </Routes>
        </RoleRedirectManager>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
