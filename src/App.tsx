
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { MainLayout } from '@/components/layout/main-layout';
import LoginPage from '@/pages/auth/login';
import Index from '@/pages/Index';
import Dashboard from '@/pages/dashboard';
import EmployeeDashboard from '@/pages/employee/dashboard';
import EmployeeReports from '@/pages/employee/reports';
import EmployeeTimeTracker from '@/pages/employee/time-tracker';
import EmployeeIdleTime from '@/pages/employee/idle-time';
import AdminDashboard from '@/pages/admin';
import AdminIdleLogs from '@/pages/admin/idle-logs';
import AdminScreenshots from '@/pages/admin/screenshots';
import Projects from '@/pages/projects';
import Users from '@/pages/users';
import Settings from '@/pages/settings';
import Reports from '@/pages/reports';
import TimeReports from '@/pages/time-reports';
import AppsUrlsIdle from '@/pages/reports/apps-urls-idle';
import Screenshots from '@/pages/screenshots';
import TimeTracking from '@/pages/time-tracking';
import Calendar from '@/pages/calendar';
import Insights from '@/pages/insights';
import NotFound from '@/pages/not-found';

// Role-based route protection component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { userDetails, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!userDetails) {
    return <Navigate to="/login" replace />;
  }
  
  if (!allowedRoles.includes(userDetails.role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = userDetails.role === 'admin' || userDetails.role === 'manager' 
      ? '/admin' 
      : '/employee/dashboard';
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const isAdminOnly = import.meta.env.VITE_ADMIN_ONLY === 'true';

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected routes with sidebar */}
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Employee routes - only show if not admin-only mode */}
        {!isAdminOnly && (
          <>
            <Route 
              path="/employee/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employee/reports" 
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <EmployeeReports />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employee/time-tracker" 
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <EmployeeTimeTracker />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employee/idle-time" 
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <EmployeeIdleTime />
                </ProtectedRoute>
              } 
            />
          </>
        )}
        
        {/* Admin routes - require admin or manager role */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/idle-logs" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <AdminIdleLogs />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/screenshots" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <AdminScreenshots />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/projects" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Projects />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/users" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Users />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Reports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/time-reports" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <TimeReports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports/apps-urls-idle" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <AppsUrlsIdle />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/screenshots" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Screenshots />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/time-tracking" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <TimeTracking />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/calendar" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Calendar />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/insights" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Insights />
            </ProtectedRoute>
          } 
        />
      </Route>
      
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
