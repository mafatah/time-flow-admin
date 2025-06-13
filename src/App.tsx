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
import DebugUrlTracking from '@/components/debug/debug-url-tracking';


console.log('🚀 App.tsx loading...');

// Add global error handlers to catch JavaScript errors
console.log('🔧 Setting up global error handlers...');

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
  if (type === 'error') {
    console.log('📡 Error event listener added');
  }
  return originalAddEventListener.call(this, type, listener, options);
};

// Track script loading
const originalCreateElement = document.createElement;
document.createElement = function(tagName: string) {
  const element = originalCreateElement.call(this, tagName);
  if (tagName.toLowerCase() === 'script') {
    console.log('📜 Script element created');
    const scriptElement = element as HTMLScriptElement;
    scriptElement.addEventListener('load', () => {
      console.log('✅ Script loaded successfully:', scriptElement.src);
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

console.log('🌐 Environment check:', {
  userAgent: navigator.userAgent,
  url: window.location.href,
  origin: window.location.origin,
  pathname: window.location.pathname,
  search: window.location.search,
  hash: window.location.hash
});

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
    console.log('🚫 No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('✅ User authenticated, rendering protected content');
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
    console.log('🚫 No user details found, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  if (userDetails.role !== 'admin') {
    console.log('🚫 User is not admin, redirecting to employee dashboard');
    return <Navigate to="/employee" replace />;
  }
  
  console.log('✅ Admin user authenticated, rendering admin content');
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
    console.log('🚫 No user details found, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // If admin tries to access employee routes, redirect to admin dashboard
  if (userDetails.role === 'admin') {
    console.log('🚫 Admin user accessing employee route, redirecting to admin dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('✅ Employee user authenticated, rendering employee content');
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
  
  console.log('🧭 SafeNavigate called:', { to, replace, currentPath: location.pathname });
  
  React.useEffect(() => {
    // Prevent navigation to the same route
    if (location.pathname !== to) {
      console.log('🧭 Navigating from', location.pathname, 'to', to);
      const timer = setTimeout(() => {
        navigate(to, { replace });
      }, 10); // Small delay to prevent rapid navigation
      
      return () => clearTimeout(timer);
    } else {
      console.log('🧭 Already at destination:', to);
    }
  }, [to, replace, navigate, location.pathname]);
  
  return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;
}

// Component to wrap route components with error tracking
function RouteWrapper({ children, routeName }: { children: React.ReactNode; routeName: string }) {
  console.log(`🛣️ Rendering route: ${routeName}`);
  
  React.useEffect(() => {
    console.log(`📍 Route mounted: ${routeName}`);
    return () => {
      console.log(`📍 Route unmounted: ${routeName}`);
    };
  }, [routeName]);
  
  return <>{children}</>;
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
      
      {/* Admin Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <RouteWrapper routeName="dashboard">
                <DashboardPage />
              </RouteWrapper>
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/reports" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <RouteWrapper routeName="reports">
                <ReportsPage />
              </RouteWrapper>
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/reports/time-reports" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <RouteWrapper routeName="time-reports">
                <TimeReportsPage />
              </RouteWrapper>
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/reports/all-employee" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <AllEmployeeReport />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/reports/individual-employee" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <IndividualEmployeeReport />
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
      
      <Route path="/apps" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <AppsViewer />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/urls" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <UrlsViewer />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/debug-url-tracking" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <DebugUrlTracking />
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
      
      <Route path="/time-logs" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <TimeLogsPage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/employee-settings" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <EmployeeSettingsPage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/finance" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <FinancePage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/suspicious-activity" element={
        <ProtectedRoute>
          <AdminRoute>
            <AppLayout>
              <SuspiciousActivityPage />
            </AppLayout>
          </AdminRoute>
        </ProtectedRoute>
      } />

      {/* Debug Route - Available to both admin and employee */}
      
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
