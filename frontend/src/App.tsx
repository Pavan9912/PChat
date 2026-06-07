import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import { updateDocumentTheme } from './store/slices/themeSlice';

// Import Pages & Components
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

export const App: React.FC = () => {
  const { mode } = useSelector((state: RootState) => state.theme);
  const { token } = useSelector((state: RootState) => state.auth);

  // Synchronize dark/light theme state with document classlist
  useEffect(() => {
    updateDocumentTheme(mode);
  }, [mode]);

  return (
    <Router>
      <Routes>
        {/* Public Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Guest Authentication Routing */}
        <Route
          path="/login"
          element={
            token ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
                <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
                <LoginForm />
              </div>
            )
          }
        />
        <Route
          path="/register"
          element={
            token ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
                <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
                <RegisterForm />
              </div>
            )
          }
        />
        <Route
          path="/forgot-password"
          element={
            token ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
                <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
                <ForgotPassword />
              </div>
            )
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            token ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
                <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
                <ResetPassword />
              </div>
            )
          }
        />

        {/* Authenticated Dashboard Routing */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};
export default App;
