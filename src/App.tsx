import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { MainLayout } from "@/components/layout/main-layout";
import { Loading } from "@/components/layout/loading";

// Auth pages
import LoginPage from "@/pages/auth/login";

// App pages
import Dashboard from "@/pages/dashboard";
import UsersPage from "@/pages/users/users-management";
import ProjectsPage from "@/pages/projects";
import TimeTrackerPage from "@/pages/time-tracker";
import TimeReportsPage from "@/pages/time-reports";
import ScreenshotsPage from "@/pages/screenshots/screenshots-viewer";
import CalendarPage from "@/pages/calendar";
import ReportsPage from "@/pages/reports";
import AppsUrlsIdlePage from "@/pages/reports/apps-urls-idle";
import InsightsPage from "@/pages/insights";
import SettingsPage from "@/pages/settings";
import NotFoundPage from "@/pages/not-found";
import Index from "@/pages/Index";

// Employee-specific pages
import EmployeeDashboard from "@/pages/employee/dashboard";
import EmployeeTimeTracker from "@/pages/employee/time-tracker";
import EmployeeReports from "@/pages/employee/reports";
import EmployeeIdleTime from "@/pages/employee/idle-time";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  }
});

// Protected route component with role-based access
function ProtectedRoute({ children, allowedRoles }: { 
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'manager' | 'employee')[];
}) {
  const { user, userDetails, loading } = useAuth();

  if (loading) {
    return <Loading message="Authenticating..." />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If roles are specified, check if user has required role
  if (allowedRoles && userDetails?.role && !allowedRoles.includes(userDetails.role as any)) {
    // Redirect employees to their dashboard, admins/managers to main dashboard
    if (userDetails.role === 'employee') {
      return <Navigate to="/employee/dashboard" />;
    } else {
      return <Navigate to="/dashboard" />;
    }
  }

  return <>{children}</>;
}

// Role-based dashboard redirect
function DashboardRedirect() {
  const { userDetails, loading } = useAuth();

  if (loading) {
    return <Loading message="Loading..." />;
  }

  if (userDetails?.role === 'employee') {
    return <Navigate to="/employee/dashboard" replace />;
  } else {
    return <Navigate to="/dashboard" replace />;
  }
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<DashboardRedirect />} />
      
      {/* Admin/Manager Routes */}
      <Route element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/screenshots" element={<ScreenshotsPage />} />
        <Route path="/reports/apps-urls-idle" element={<AppsUrlsIdlePage />} />
        <Route path="/insights" element={<InsightsPage />} />
      </Route>
      
      <Route element={
        <ProtectedRoute allowedRoles={['admin']}>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Employee Routes */}
      <Route element={
        <ProtectedRoute allowedRoles={['employee']}>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/employee/time-tracker" element={<EmployeeTimeTracker />} />
        <Route path="/employee/reports" element={<EmployeeReports />} />
        <Route path="/employee/idle-time" element={<EmployeeIdleTime />} />
      </Route>

      {/* Shared Routes (all roles) */}
      <Route element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/time-tracker" element={<TimeTrackerPage />} />
        <Route path="/time-reports" element={<TimeReportsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
