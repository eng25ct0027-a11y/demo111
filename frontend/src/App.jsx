import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import api from './api/axios.js';
import { useAuth } from './store/authStore.js';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import { Landing, AuthPage, Onboarding, Dashboard, Discover, Profile, Hackathons, Connections, Messages, Teams, NotFound } from './pages/index.jsx';

function Protected({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.onboardingComplete && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  const { user, setUser, clearUser } = useAuth();
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('cofounder-token')));
  useEffect(() => {
    if (!localStorage.getItem('cofounder-token')) { setLoading(false); return; }
    api.get('/auth/me').then((response) => setUser(response.data)).catch(() => clearUser()).finally(() => setLoading(false));
  }, [setUser, clearUser]);
  if (loading) return <div className="loading-screen"><div className="spinner" />Preparing your workspace…</div>;
  return <Routes>
    <Route path="/" element={user ? <Navigate to={user.onboardingComplete ? '/dashboard' : '/onboarding'} replace /> : <Landing />} />
    <Route path="/login" element={user ? <Navigate to={user.onboardingComplete ? '/dashboard' : '/onboarding'} replace /> : <AuthPage />} />
    <Route path="/register" element={user ? <Navigate to={user.onboardingComplete ? '/dashboard' : '/onboarding'} replace /> : <AuthPage register />} />
    <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
    <Route path="/*" element={<Protected><DashboardLayout><Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/discover" element={<Discover />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:id" element={<Profile />} />
      <Route path="/hackathons" element={<Hackathons />} />
      <Route path="/connections" element={<Connections />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/messages/:userId" element={<Messages />} />
      <Route path="/teams" element={<Teams />} />
      <Route path="*" element={<NotFound />} />
    </Routes></DashboardLayout></Protected>} />
  </Routes>;
}
