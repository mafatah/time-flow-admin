import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { TrackerProvider } from '@/providers/tracker-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import MainLayout from '@/components/layout/main-layout';

// Lazy load pages for better performance
import LoginPage from '@/pages/auth/login';
import DashboardPage from '@/pages/dashboard';
import EmployeeDashboard from '@/pages/employee/dashboard';
import EmployeeTimeTracker from '@/pages/employee/time-tracker';
import EmployeeReports from '@/pages/employee/reports';
import ReportsPage from '@/pages/reports';
import TimeReportsPage from '@/pages/time-reports';
import InsightsPage from '@/pages/insights';
import AppsUrlsIdle from '@/pages/reports/apps-urls-idle';
import UsersPage from '@/pages/users';
import ProjectsPage from '@/pages/projects';
import ScreenshotsPage from '@/pages/screenshots';
import SettingsPage from '@/pages/settings';
import CalendarPage from '@/pages/calendar';
import TimeTrackingPage from '@/pages/time-tracking';

console.log('🚀 App.tsx loading...');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected route wrapper that requires authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  console.log('🔒 ProtectedRoute - user:', !!user, 'loading:', loading);
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Admin route wrapper that requires admin role
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { userDetails, loading } = useAuth();
  
  console.log('👑 AdminRoute - userDetails:', userDetails, 'loading:', loading);
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!userDetails) {
    return <Navigate to="/login" replace />;
  }
  
  if (userDetails.role !== 'admin') {
    return <Navigate to="/employee" replace />;
  }
  
  return <>{children}</>;
}

// Employee route wrapper
function EmployeeRoute({ children }: { children: React.ReactNode }) {
  const { userDetails, loading } = useAuth();
  
  console.log('👤 EmployeeRoute - userDetails:', userDetails, 'loading:', loading);
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!userDetails) {
    return <Navigate to="/login" replace />;
  }
  
  // If admin tries to access employee routes, redirect to admin dashboard
  if (userDetails.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Layout wrapper for authenticated pages
function AppLayout({ children }: { children: React.ReactNode }) {
  console.log('🏗️ AppLayout rendering');
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
}

// Safe Navigate component to prevent SecurityError
function SafeNavigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  React.useEffect(() => {
    // Prevent navigation to the same route
    if (location.pathname !== to) {
      const timer = setTimeout(() => {
        navigate(to, { replace });
      }, 10); // Small delay to prevent rapid navigation
      
      return () => clearTimeout(timer);
    }
  }, [to, replace, navigate, location.pathname]);
  
  return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;
}

// Main routes component that will be wrapped by AuthProvider
function AppRoutes() {
  const { user, userDetails, loading } = useAuth();
  
  console.log('🛣️ AppRoutes - user:', !!user, 'userDetails:', userDetails, 'loading:', loading);
  
  // Show loading while auth is being determined
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return (
    <Routes>
      {/* Login route - redirect if already authenticated */}
      <Route 
        path="/login" 
        element={
          user && userDetails ? (
            userDetails.role === 'admin' ? (
              <SafeNavigate to="/dashboard" replace />
            ) : (
              <SafeNavigate to="/employee" replace />
            )
          ) : (
            <LoginPage />
          )
        } 
      />
      
      {/* Root redirect */}
      <Route 
        path="/" 
        element={
          user && userDetails ? (
            userDetails.role === 'admin' ? (
              <SafeNavigate to="/dashboard" replace />
            ) : (
              <SafeNavigate to="/employee" replace />
            )
          ) : (
            <SafeNavigate to="/login" replace />
          )
        } 
      />
      
      {/* Admin Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/reports" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <ReportsPage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/reports/time-reports" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <TimeReportsPage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/reports/apps-urls-idle" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <AppsUrlsIdle />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/insights" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <InsightsPage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/users" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <UsersPage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/projects" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <ProjectsPage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/screenshots" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <ScreenshotsPage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/calendar" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <CalendarPage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/time-tracking" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <TimeTrackingPage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      {/* Employee Routes */}
      <Route path="/employee" element={
        <ProtectedRoute>
          <EmployeeRoute>
            <AppLayout>
              <EmployeeDashboard />
            </AppLayout>
          </EmployeeRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/employee/time-tracker" element={
        <ProtectedRoute>
          <EmployeeRoute>
            <AppLayout>
              <TrackerProvider>
                <EmployeeTimeTracker />
              </TrackerProvider>
            </AppLayout>
          </EmployeeRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/employee/reports" element={
        <ProtectedRoute>
          <EmployeeRoute>
            <AppLayout>
              <EmployeeReports />
            </AppLayout>
          </EmployeeRoute>
        </ProtectedRoute>
      } />
      
      {/* Catch all route */}
      <Route path="*" element={<SafeNavigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  console.log('🎯 App component rendering');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <TooltipProvider>
              <div className="min-h-screen bg-background w-full">
                <AppRoutes />
                <Toaster />
              </div>
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
