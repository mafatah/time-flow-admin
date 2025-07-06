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
import ResetPassword from '@/pages/auth/reset-password';
import DownloadPage from '@/pages/download';
import DashboardPage from '@/pages/dashboard';
import EmployeeDashboard from '@/pages/employee/dashboard';
import EmployeeTimeTracker from '@/pages/employee/time-tracker';
import EmployeeReports from '@/pages/employee/reports';
import ReportsPage from '@/pages/reports';
import TimeReportsPage from '@/pages/time-reports';
import AllEmployeeReport from '@/pages/reports/all-employee-report';
import IndividualEmployeeReport from '@/pages/reports/individual-employee-report';
import InsightsPage from '@/pages/insights';
import AppsUrlsIdle from '@/pages/reports/apps-urls-idle';
import AppActivityPage from '@/pages/app-activity';
import UrlActivityPage from '@/pages/url-activity';
import UsersPage from '@/pages/users/users-management';
import ProjectsPage from '@/pages/projects';
import ScreenshotsPage from '@/pages/screenshots';
import AppsViewer from '@/pages/screenshots/apps-viewer';
import UrlsViewer from '@/pages/screenshots/urls-viewer';
import SettingsPage from '@/pages/settings';
import CalendarPage from '@/pages/calendar';
import TimeTrackingPage from '@/pages/time-tracking';
import TimeLogsPage from '@/pages/time-logs';
import EmployeeSettingsPage from '@/pages/employee-settings';
import FinancePage from '@/pages/finance';
import SuspiciousActivityPage from '@/pages/suspicious-activity';
import AIAnalysisPage from '@/pages/ai-analysis';
import EmailReportsPage from '@/pages/admin/email-reports';
import AdminScreenshotsPage from '@/pages/admin/screenshots';
import AdminIdleLogsPage from '@/pages/admin/idle-logs';
import AdminDashboard from '@/pages/admin';

// import DebugUrlTracking from '@/components/debug/debug-url-tracking';


// App loading and error handler setup logging disabled for performance

// Catch unhandled JavaScript errors
window.addEventListener('error', (event) => {
  console.error('❌ Global JavaScript Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack
  });
});

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise
  });
});

// Add resource loading error detection
const originalAddEventListener = document.addEventListener;
document.addEventListener = function(type: string, listener: any, options?: any) {
  // Error event listener logging disabled for performance
  return originalAddEventListener.call(this, type, listener, options);
};

// Track script loading
const originalCreateElement = document.createElement;
document.createElement = function(tagName: string) {
  const element = originalCreateElement.call(this, tagName);
  if (tagName.toLowerCase() === 'script') {
    // Script element logging disabled for performance
    const scriptElement = element as HTMLScriptElement;
    scriptElement.addEventListener('load', () => {
      // Script load logging disabled for performance
    });
    scriptElement.addEventListener('error', (event) => {
      console.error('❌ Script failed to load:', {
        src: scriptElement.src,
        event: event
      });
    });
  }
  return element;
};

// Environment check logging disabled for performance

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Global flag to control debug logging (set to false for production)
const DEBUG_LOGGING = false;

const safeLog = (...args: any[]) => {
  if (DEBUG_LOGGING) {
    console.log(...args);
  }
};

// Optimized Protected route wrapper
const ProtectedRoute = React.memo(({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    safeLog('🚫 No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  safeLog('✅ User authenticated, rendering protected content');
  return <>{children}</>;
});

// Optimized Admin route wrapper
const AdminRoute = React.memo(({ children }: { children: React.ReactNode }) => {
  const { userDetails, loading } = useAuth();
  
  safeLog('👑 AdminRoute - userDetails:', userDetails, 'loading:', loading);
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!userDetails) {
    safeLog('🚫 No user details found, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  if (userDetails.role !== 'admin') {
    safeLog('🚫 User is not admin, redirecting to employee dashboard');
    return <Navigate to="/employee" replace />;
  }
  
  safeLog('✅ Admin user authenticated, rendering admin content');
  return <>{children}</>;
});

// Optimized Employee route wrapper
const EmployeeRoute = React.memo(({ children }: { children: React.ReactNode }) => {
  const { userDetails, loading } = useAuth();
  
  safeLog('👤 EmployeeRoute - userDetails:', userDetails, 'loading:', loading);
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!userDetails) {
    safeLog('🚫 No user details found, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // If admin tries to access employee routes, redirect to admin dashboard
  if (userDetails.role === 'admin') {
    safeLog('🚫 Admin user accessing employee route, redirecting to admin dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  safeLog('✅ Employee user authenticated, rendering employee content');
  return <>{children}</>;
});

// Optimized Layout wrapper for authenticated pages
const AppLayout = React.memo(({ children }: { children: React.ReactNode }) => {
  safeLog('🏗️ AppLayout rendering');
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
});

// Optimized Safe Navigate component
const SafeNavigate = React.memo(({ to, replace = false }: { to: string; replace?: boolean }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  safeLog('🧭 SafeNavigate called:', { to, replace, currentPath: location.pathname });
  
  React.useEffect(() => {
    // Prevent navigation to the same route
    if (location.pathname !== to) {
      safeLog('🧭 Navigating from', location.pathname, 'to', to);
      const timer = setTimeout(() => {
        navigate(to, { replace });
      }, 10); // Small delay to prevent rapid navigation
      
      return () => clearTimeout(timer);
    } else {
      safeLog('🧭 Already at destination:', to);
    }
  }, [to, replace, navigate, location.pathname]);
  
  return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;
});

// Simplified Route Wrapper without excessive logging
const RouteWrapper = React.memo(({ children, routeName }: { children: React.ReactNode; routeName: string }) => {
  safeLog(`🛣️ Rendering route: ${routeName}`);
  
  React.useEffect(() => {
    safeLog(`📍 Route mounted: ${routeName}`);
    return () => {
      safeLog(`📍 Route unmounted: ${routeName}`);
    };
  }, [routeName]);
  
  return <>{children}</>;
});

// Combined Admin Layout wrapper to reduce nesting
const AdminLayoutWrapper = React.memo(({ children, routeName }: { children: React.ReactNode; routeName: string }) => {
  return (
    <ProtectedRoute>
      <AdminRoute>
        <AppLayout>
          <RouteWrapper routeName={routeName}>
            {children}
          </RouteWrapper>
        </AppLayout>
      </AdminRoute>
    </ProtectedRoute>
  );
});

// Combined Employee Layout wrapper
const EmployeeLayoutWrapper = React.memo(({ children, routeName }: { children: React.ReactNode; routeName: string }) => {
  return (
    <ProtectedRoute>
      <EmployeeRoute>
        <AppLayout>
          <RouteWrapper routeName={routeName}>
            {children}
          </RouteWrapper>
        </AppLayout>
      </EmployeeRoute>
    </ProtectedRoute>
  );
});

// Main routes component that will be wrapped by AuthProvider
function AppRoutes() {
  const { user, userDetails, loading } = useAuth();
  
  safeLog('🛣️ AppRoutes - user:', !!user, 'userDetails:', userDetails, 'loading:', loading);
  
  // Show loading while auth is being determined
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return (
    <Routes>
      {/* Public Download Route - No Authentication Required */}
      <Route path="/download" element={
        <RouteWrapper routeName="download">
          <DownloadPage />
        </RouteWrapper>
      } />
      
      {/* Login route - redirect if already authenticated */}
      <Route 
        path="/login" 
        element={
          user && userDetails ? (
            userDetails.role === 'admin' ? (
              <RouteWrapper routeName="login-redirect-admin">
                <SafeNavigate to="/dashboard" replace />
              </RouteWrapper>
            ) : (
              <RouteWrapper routeName="login-redirect-employee">
                <SafeNavigate to="/employee" replace />
              </RouteWrapper>
            )
          ) : (
            <RouteWrapper routeName="login">
              <LoginPage />
            </RouteWrapper>
          )
        } 
      />
      
      {/* Password Reset Route - Public */}
      <Route 
        path="/auth/reset-password" 
        element={
          <RouteWrapper routeName="reset-password">
            <ResetPassword />
          </RouteWrapper>
        } 
      />
      
      {/* Root redirect */}
      <Route 
        path="/" 
        element={
          user && userDetails ? (
            userDetails.role === 'admin' ? (
              <RouteWrapper routeName="root-redirect-admin">
                <SafeNavigate to="/dashboard" replace />
              </RouteWrapper>
            ) : (
              <RouteWrapper routeName="root-redirect-employee">
                <SafeNavigate to="/employee" replace />
              </RouteWrapper>
            )
          ) : (
            <RouteWrapper routeName="root-redirect-login">
              <SafeNavigate to="/login" replace />
            </RouteWrapper>
          )
        } 
      />
      
      {/* Admin Routes - Using optimized wrapper */}
      <Route path="/dashboard" element={
        <AdminLayoutWrapper routeName="dashboard">
          <DashboardPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/reports" element={
        <AdminLayoutWrapper routeName="reports">
          <ReportsPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/reports/time-reports" element={
        <AdminLayoutWrapper routeName="time-reports">
          <TimeReportsPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/reports/all-employee" element={
        <AdminLayoutWrapper routeName="all-employee">
          <AllEmployeeReport />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/reports/individual-employee" element={
        <AdminLayoutWrapper routeName="individual-employee">
          <IndividualEmployeeReport />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/reports/apps-urls-idle" element={
        <AdminLayoutWrapper routeName="apps-urls-idle">
          <AppsUrlsIdle />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/app-activity" element={
        <AdminLayoutWrapper routeName="app-activity">
          <AppActivityPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/url-activity" element={
        <AdminLayoutWrapper routeName="url-activity">
          <UrlActivityPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/insights" element={
        <AdminLayoutWrapper routeName="insights">
          <InsightsPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/users" element={
        <AdminLayoutWrapper routeName="users">
          <UsersPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/projects" element={
        <AdminLayoutWrapper routeName="projects">
          <ProjectsPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/screenshots" element={
        <AdminLayoutWrapper routeName="screenshots">
          <ScreenshotsPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/apps" element={
        <AdminLayoutWrapper routeName="apps">
          <AppsViewer />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/urls" element={
        <AdminLayoutWrapper routeName="urls">
          <UrlsViewer />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/settings" element={
        <AdminLayoutWrapper routeName="settings">
          <SettingsPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/calendar" element={
        <AdminLayoutWrapper routeName="calendar">
          <CalendarPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/time-tracking" element={
        <AdminLayoutWrapper routeName="time-tracking">
          <TimeTrackingPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/time-logs" element={
        <AdminLayoutWrapper routeName="time-logs">
          <TimeLogsPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/employee-settings" element={
        <AdminLayoutWrapper routeName="employee-settings">
          <EmployeeSettingsPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/finance" element={
        <AdminLayoutWrapper routeName="finance">
          <FinancePage />
        </AdminLayoutWrapper>
      } />
      
                  <Route path="/suspicious-activity" element={
              <AdminLayoutWrapper routeName="suspicious-activity">
                <SuspiciousActivityPage />
              </AdminLayoutWrapper>
            } />
            <Route path="/ai-analysis" element={
              <AdminLayoutWrapper routeName="ai-analysis">
                <AIAnalysisPage />
              </AdminLayoutWrapper>
            } />
      
      <Route path="/admin" element={
        <AdminLayoutWrapper routeName="admin">
          <AdminDashboard />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/admin/email-reports" element={
        <AdminLayoutWrapper routeName="admin-email-reports">
          <EmailReportsPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/admin/screenshots" element={
        <AdminLayoutWrapper routeName="admin-screenshots">
          <AdminScreenshotsPage />
        </AdminLayoutWrapper>
      } />
      
      <Route path="/admin/idle-logs" element={
        <AdminLayoutWrapper routeName="admin-idle-logs">
          <AdminIdleLogsPage />
        </AdminLayoutWrapper>
      } />

      {/* Employee Routes - Using optimized wrapper */}
      <Route path="/employee" element={
        <EmployeeLayoutWrapper routeName="employee">
          <EmployeeDashboard />
        </EmployeeLayoutWrapper>
      } />
      
      <Route path="/employee/time-tracker" element={
        <EmployeeLayoutWrapper routeName="employee-time-tracker">
          <TrackerProvider>
            <EmployeeTimeTracker />
          </TrackerProvider>
        </EmployeeLayoutWrapper>
      } />
      
      <Route path="/employee/reports" element={
        <EmployeeLayoutWrapper routeName="employee-reports">
          <EmployeeReports />
        </EmployeeLayoutWrapper>
      } />
      
      {/* Catch all route */}
      <Route path="*" element={<SafeNavigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  safeLog('🎯 App component rendering');
  
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
