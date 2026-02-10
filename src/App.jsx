import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProductStudio from './pages/ProductStudio';
import LoginPage from './pages/LoginPage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
          {/* Default redirect to studio (which will redirect to login if needed) */}
          <Route path="/" element={<Navigate to="/studio" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
