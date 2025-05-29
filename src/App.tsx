import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { MainLayout } from "@/components/layout/main-layout";
import LoginPage from "@/pages/auth/login";
import Index from "@/pages/Index";
import TimeTracker from "@/pages/time-tracking/time-tracker";
import TimeLogs from "@/pages/time-tracking/time-logs";
import TimeTrackingPage from "@/pages/time-tracking";
import CalendarPage from "@/pages/calendar";
import Projects from "@/pages/projects";
import Users from "@/pages/users";
import Screenshots from "@/pages/screenshots";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import AdminIndex from "@/pages/admin";
import InsightsPage from "@/pages/insights";
import TimeReports from "@/pages/time-reports";
import NotFound from "@/pages/not-found";

// Employee pages
import EmployeeDashboard from "@/pages/employee/dashboard";
import EmployeeTimeTracker from "@/pages/employee/time-tracker";
import EmployeeReports from "@/pages/employee/reports";
import EmployeeIdleTime from "@/pages/employee/idle-time";

// Admin pages
import AdminIdleLogs from "@/pages/admin/idle-logs";
import AdminScreenshots from "@/pages/admin/screenshots";

// Reports pages
import AppsUrlsIdle from "@/pages/reports/apps-urls-idle";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary text-primary-foreground px-4 py-2 rounded"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/" replace /> : <LoginPage />
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout>
            <Index />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <MainLayout>
            <Index />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/time-tracker" element={
        <ProtectedRoute>
          <MainLayout>
            <TimeTracker />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/time-tracking" element={
        <ProtectedRoute>
          <MainLayout>
            <TimeTrackingPage />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/time-logs" element={
        <ProtectedRoute>
          <MainLayout>
            <TimeLogs />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/calendar" element={
        <ProtectedRoute>
          <MainLayout>
            <CalendarPage />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/projects" element={
        <ProtectedRoute>
          <MainLayout>
            <Projects />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/users" element={
        <ProtectedRoute>
          <MainLayout>
            <Users />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/screenshots" element={
        <ProtectedRoute>
          <MainLayout>
            <Screenshots />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/reports" element={
        <ProtectedRoute>
          <MainLayout>
            <Reports />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/time-reports" element={
        <ProtectedRoute>
          <MainLayout>
            <TimeReports />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/insights" element={
        <ProtectedRoute>
          <MainLayout>
            <InsightsPage />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute>
          <MainLayout>
            <Settings />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin" element={
        <ProtectedRoute>
          <MainLayout>
            <AdminIndex />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      {/* Employee Routes */}
      <Route path="/employee/dashboard" element={
        <ProtectedRoute>
          <MainLayout>
            <EmployeeDashboard />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/employee/time-tracker" element={
        <ProtectedRoute>
          <MainLayout>
            <EmployeeTimeTracker />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/employee/reports" element={
        <ProtectedRoute>
          <MainLayout>
            <EmployeeReports />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/employee/idle-time" element={
        <ProtectedRoute>
          <MainLayout>
            <EmployeeIdleTime />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin/idle-logs" element={
        <ProtectedRoute>
          <MainLayout>
            <AdminIdleLogs />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/screenshots" element={
        <ProtectedRoute>
          <MainLayout>
            <AdminScreenshots />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      {/* Reports Routes */}
      <Route path="/reports/apps-urls-idle" element={
        <ProtectedRoute>
          <MainLayout>
            <AppsUrlsIdle />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AppRoutes />
            <Toaster />
            <Sonner />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
