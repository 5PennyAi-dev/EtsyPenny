import * as Sentry from '@sentry/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProductStudio from './pages/ProductStudio';
import LoginPage from './pages/LoginPage';
import HistoryPage from './pages/HistoryPage';
import Dashboard from './pages/Dashboard';
import MyShopPage from './pages/MyShopPage';
import SEOLab from './pages/SEOLab';
import AdminSystemPage from './pages/AdminSystemPage';
import UserSettings from './pages/UserSettings';
import LandingPage from './pages/LandingPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import PricingPage from './pages/PricingPage';
import BillingPage from './pages/BillingPage';
import ListingsByStatusPage from './pages/ListingsByStatusPage';

import DocsLayout from './components/docs/DocsLayout';
import MarkdownArticle from './components/docs/MarkdownArticle';

import { BulkProgressProvider } from './context/BulkProgressContext';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BulkProgressProvider>
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
          {/* TODO: re-enable when Etsy API license is approved */}
          <Route path="/shop" element={<Navigate to="/dashboard" replace />} />
          <Route 
            path="/lab" 
            element={
              <ProtectedRoute>
                <SEOLab />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/admin/system"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminSystemPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <UserSettings />
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
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/listings"
            element={
              <ProtectedRoute>
                <ListingsByStatusPage />
              </ProtectedRoute>
            }
          />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/docs" element={<DocsLayout />}>
            <Route index element={<Navigate to="/docs/getting-started" replace />} />
            <Route path="*" element={<MarkdownArticle />} />
          </Route>
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
      </BulkProgressProvider>
    </AuthProvider>
  );
}

export default Sentry.withErrorBoundary(App, {
  fallback: (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>
      Something went wrong. Please refresh the page.
    </div>
  ),
});
