
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/providers/auth-provider';
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

function App() {
  // Check if we're in admin-only mode
  const isAdminOnly = import.meta.env.VITE_ADMIN_ONLY === 'true';

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes with sidebar */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Employee routes - only show if not admin-only mode */}
          {!isAdminOnly && (
            <>
              <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
              <Route path="/employee/reports" element={<EmployeeReports />} />
              <Route path="/employee/time-tracker" element={<EmployeeTimeTracker />} />
              <Route path="/employee/idle-time" element={<EmployeeIdleTime />} />
            </>
          )}
          
          {/* Admin routes - always available */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/idle-logs" element={<AdminIdleLogs />} />
          <Route path="/admin/screenshots" element={<AdminScreenshots />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/time-reports" element={<TimeReports />} />
          <Route path="/reports/apps-urls-idle" element={<AppsUrlsIdle />} />
          <Route path="/screenshots" element={<Screenshots />} />
          <Route path="/time-tracking" element={<TimeTracking />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/insights" element={<Insights />} />
        </Route>
        
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
