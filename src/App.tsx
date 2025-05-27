
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/providers/auth-provider';
import LoginPage from '@/pages/auth/login';
import Index from '@/pages/Index';
import Dashboard from '@/pages/dashboard';
import EmployeeDashboard from '@/pages/employee/dashboard';
import EmployeeReports from '@/pages/employee/reports';
import EmployeeTimeTracker from '@/pages/employee/time-tracker';
import AdminDashboard from '@/pages/admin';
import Projects from '@/pages/projects';
import Users from '@/pages/users';
import Settings from '@/pages/settings';
import Reports from '@/pages/reports';
import Screenshots from '@/pages/screenshots';
import TimeTracking from '@/pages/time-tracking';
import NotFound from '@/pages/not-found';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/employee/reports" element={<EmployeeReports />} />
        <Route path="/employee/time-tracker" element={<EmployeeTimeTracker />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/screenshots" element={<Screenshots />} />
        <Route path="/time-tracking" element={<TimeTracking />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
