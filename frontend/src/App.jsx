import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';

import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import DocumentDetails from './pages/DocumentDetails';
import UploadDocument from './pages/UploadDocument';
import AdvancedSearch from './pages/AdvancedSearch';
import AccessRequests from './pages/AccessRequests';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Authenticated Dashboard Shell */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/documents/:docId" element={<DocumentDetails />} />
              <Route path="/upload" element={<UploadDocument />} />
              <Route path="/search" element={<AdvancedSearch />} />
              <Route path="/access-requests" element={<AccessRequests />} />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />
              <Route path="/settings" element={<Settings />} />
              
              {/* Fallback inside authenticated shell */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
