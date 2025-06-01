
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { TrackerProvider } from '@/providers/tracker-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import MainLayout from '@/components/layout/main-layout';

// Import pages
import LoginPage from '@/pages/auth/login';
import DashboardPage from '@/pages/dashboard';
import ReportsPage from '@/pages/reports';
import TimeReportsPage from '@/pages/time-reports';
import AppsUrlsIdle from '@/pages/reports/apps-urls-idle';
import EmployeeDashboard from '@/pages/employee/dashboard';
import EmployeeTimeTracker from '@/pages/employee/time-tracker';
import EmployeeReports from '@/pages/employee/reports';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route wrapper that requires authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
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
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!userDetails || userDetails.role !== 'admin') {
    return <Navigate to="/employee" replace />;
  }
  
  return <>{children}</>;
}

// Employee route wrapper
function EmployeeRoute({ children }: { children: React.ReactNode }) {
  const { userDetails, loading } = useAuth();
  
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
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
}

// Main routes component
function AppRoutes() {
  const { user, userDetails } = useAuth();
  
  return (
    <Routes>
      {/* Login route - redirect if already authenticated */}
      <Route 
        path="/login" 
        element={
          user ? (
            userDetails?.role === 'admin' ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/employee" replace />
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
          user ? (
            userDetails?.role === 'admin' ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/employee" replace />
            )
          ) : (
            <Navigate to="/login" replace />
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
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <TooltipProvider>
              <div className="min-h-screen bg-background w-full">
                <AppRoutes />
                <Toaster />
              </div>
            </TooltipProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
