import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProductStudio from './pages/ProductStudio';
import LoginPage from './pages/LoginPage';
import HistoryPage from './pages/HistoryPage';
import Dashboard from './pages/Dashboard';
import BrandProfilePage from './pages/BrandProfilePage';

import { Toaster } from 'sonner';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/studio" 
            element={
              <ProtectedRoute>
                <ProductStudio />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/history" 
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/shop" 
            element={
              <ProtectedRoute>
                <BrandProfilePage />
              </ProtectedRoute>
            } 
          />
          {/* Default redirect to studio (which will redirect to login if needed) */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
