import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from './lib/api'

import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Items from './pages/Items'
import Issues from './pages/Issues'
import ItemRenewal from './pages/ItemRenewal'
import Replacements from './pages/Replacements'
import Reports from './pages/Reports'
import EmployeeAssetProfile from './pages/EmployeeAssetProfile'

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      navigate('/login');
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, [navigate]);

  const { data: authData, isLoading } = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/me');
        return data.admin || data.user || data;
      } catch (err) {
        return null; // Not logged in
      }
    },
    retry: false
  });

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center text-primary text-xl font-medium animate-pulse">Loading Brakes India...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300">
      <Routes>
        <Route path="/login" element={authData ? <Navigate to="/" /> : <Login />} />
        
        {/* Protected Routes */}
        <Route element={authData ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/items" element={<Items />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/item-renewal" element={<ItemRenewal />} />
          <Route path="/replacements" element={<Replacements />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/employees/:id/profile" element={<EmployeeAssetProfile />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App
