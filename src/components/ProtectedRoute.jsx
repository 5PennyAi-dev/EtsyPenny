import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  // TODO: Add actual authentication check with Supabase
  const isAuthenticated = true; // Temporary mock

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}
