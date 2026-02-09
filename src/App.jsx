import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <div className="p-8">
              <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
              <p className="mt-4 text-slate-500">Welcome to EtsyPenny.</p>
            </div>
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <h1 className="text-4xl font-bold text-indigo-600">EtsyPenny</h1>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
