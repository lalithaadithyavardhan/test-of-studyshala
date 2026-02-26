import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { injectNavigator } from './api/axios'; // ← needed for smooth 401 redirects (no hard reload)
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
import StudentFileBrowser from './pages/StudentFileBrowser';
// Admin
import AdminDashboard from './pages/AdminDashboard';
import './styles/global.css';

/**
 * BUG FIX 1 — NavigationInjector
 *
 * The fixed axios.js interceptor uses React Router's navigate() instead of
 * window.location.href to avoid hard reloads on 401 responses. However,
 * useNavigate() can only be called inside a component that is already inside
 * the <Router> tree. This tiny component lives inside <Router> and injects
 * the navigate function into the axios interceptor once on mount.
 *
 * Without this, the interceptor would fall back to window.location.href
 * (hard reload) for every expired-token redirect.
 */
const NavigationInjector = () => {
  const navigate = useNavigate();
  useEffect(() => {
    injectNavigator(navigate);
  }, [navigate]);
  return null;
};

/**
 * BUG FIX 2 — Home must be INSIDE <Router> (and inside <AuthProvider>)
 *
 * In the original code, <AuthProvider> was placed INSIDE <Router> as a child
 * of <Routes>/<Route>, which is invalid — <AuthProvider> is not a route, it's
 * a context wrapper. More critically, the <Home> component uses useAuth(),
 * which requires AuthProvider to be an ancestor. Because Home was defined
 * outside the component tree that renders AuthProvider, this worked by luck
 * in some builds but would silently fail (or throw) in others.
 *
 * Correct structure:
 *   <Router>              ← enables useNavigate / useParams etc.
 *     <AuthProvider>      ← provides useAuth() to all descendants
 *       <NavigationInjector />   ← injects navigate into axios
 *       <Routes>          ← route matching
 *         ...
 *       </Routes>
 *     </AuthProvider>
 *   </Router>
 */
const Home = () => {
  const { user, loading } = useAuth();

  // Wait for auth state to be restored from localStorage before redirecting.
  // Without this guard, the app briefly sees user=null on first load and
  // wrongly redirects to /login even for logged-in users.
  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'faculty') return <Navigate to="/faculty/dashboard" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  // Default: student
  return <Navigate to="/student/enter-code" replace />;
};

/**
 * BUG FIX 3 — Catch-all route order
 *
 * The original catch-all <Route path="*"> was placed before the Admin route,
 * meaning /admin/dashboard would be swallowed by the wildcard in some
 * bundler/router versions. Catch-all must always be the very last route.
 * (React Router v6 does use specificity-based matching so order matters less,
 * but placing "*" last is still the correct and safe pattern.)
 */
function App() {
  return (
    <Router>
      {/*
        BUG FIX 4 — AuthProvider must wrap everything inside Router.
        In the original code it was placed as a sibling of <Routes> which
        caused AuthProvider to be outside the route-rendering context,
        making it impossible to use hooks like useNavigate inside providers
        that depend on router context.
      */}
      <AuthProvider>
        {/*
          Inject React Router's navigate function into the axios interceptor
          so that 401 responses trigger a smooth SPA navigation instead of a
          hard page reload that destroys all React state.
        */}
        <NavigationInjector />

        <Routes>
          {/* Default route — redirects based on role */}
          <Route path="/" element={<Home />} />

          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/*
            BUG FIX 5 — Auth callback path.
            Must match the backend redirect: /auth-callback (not /auth/callback).
            This was already corrected in the original but noted here for clarity.
          */}
          <Route path="/auth-callback" element={<AuthCallback />} />

          {/* ── Faculty Routes ── */}
          <Route
            path="/faculty/dashboard"
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/materials"
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyMaterials />
              </ProtectedRoute>
            }
          />

          {/* ── Student Routes ── */}
          <Route
            path="/student/enter-code"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentEnterCode />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/material-access/:id"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentMaterialAccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/saved-materials"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentSavedMaterials />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/history"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/browse/:id"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentFileBrowser />
              </ProtectedRoute>
            }
          />

          {/* ── Admin Routes ── */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/*
            BUG FIX 3 — Catch-all is always LAST.
            Navigates unknown paths back to "/" which then redirects by role.
          */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
