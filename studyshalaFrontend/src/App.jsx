import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import AuthCallback from './pages/AuthCallback';

// Faculty pages
import FacultyDashboard from './pages/FacultyDashboard';
import FacultyMaterials from './pages/FacultyMaterials';

// Student pages
import StudentEnterCode from './pages/StudentEnterCode';
import StudentMaterialAccess from './pages/StudentMaterialAccess';
import StudentSavedMaterials from './pages/StudentSavedMaterials';
import StudentHistory from './pages/StudentHistory';

// Admin
import AdminDashboard from './pages/AdminDashboard';

import './styles/global.css';

// Home redirect based on role — must be inside AuthProvider
const Home = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'faculty') return <Navigate to="/faculty/dashboard" replace />;
  if (user.role === 'admin')   return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/student/enter-code" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/auth-callback" element={<AuthCallback />} />

      {/* Faculty Routes */}
      <Route path="/faculty/dashboard" element={
        <ProtectedRoute allowedRoles={['faculty']}>
          <FacultyDashboard />
        </ProtectedRoute>
      } />
      <Route path="/faculty/materials" element={
        <ProtectedRoute allowedRoles={['faculty']}>
          <FacultyMaterials />
        </ProtectedRoute>
      } />

      {/* Student Routes */}
      <Route path="/student/enter-code" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentEnterCode />
        </ProtectedRoute>
      } />
      <Route path="/student/material-access/:id" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentMaterialAccess />
        </ProtectedRoute>
      } />
      <Route path="/student/saved-materials" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentSavedMaterials />
        </ProtectedRoute>
      } />
      <Route path="/student/history" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentHistory />
        </ProtectedRoute>
      } />

      {/* Admin Route */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    // FIX: AuthProvider must wrap Router so useAuth() works everywhere including Home
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
