import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VisitorList from './pages/VisitorList';
import Register from './pages/Register';
import Roles from './pages/Roles';
import Profile from './pages/Profile';
import DashboardLayout from './components/DashboardLayout';

// Protected Route wrapper that injects DashboardLayout
const ProtectedLayoutRoute = ({ element: Element }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return (
    <DashboardLayout>
      <Element />
    </DashboardLayout>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public auth route (no layout wrapper) */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes wrapped in modern dashboard layout */}
        <Route 
          path="/dashboard" 
          element={<ProtectedLayoutRoute element={Dashboard} />} 
        />
        <Route 
          path="/register" 
          element={<ProtectedLayoutRoute element={Register} />} 
        />
        <Route 
          path="/visitors" 
          element={<ProtectedLayoutRoute element={VisitorList} />} 
        />
        <Route 
          path="/roles" 
          element={<ProtectedLayoutRoute element={Roles} />} 
        />
        <Route 
          path="/profile" 
          element={<ProtectedLayoutRoute element={Profile} />} 
        />

        {/* Fallback redirects */}
        <Route 
          path="*" 
          element={
            <Navigate 
              to={localStorage.getItem('adminToken') ? "/dashboard" : "/login"} 
              replace 
            />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
