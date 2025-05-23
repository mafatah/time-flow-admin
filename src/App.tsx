import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
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
import SettingsPage from "@/pages/settings";
import NotFoundPage from "@/pages/not-found";
import Index from "@/pages/Index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  }
});

// Protected route component
function ProtectedRoute({ children, requiredRole }: { 
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'employee';
}) {
  const { user, userDetails, loading } = useAuth();

  if (loading) {
    return <Loading message="Authenticating..." />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If a role is required, check if the user has it
  if (requiredRole && userDetails?.role !== requiredRole && 
     !(requiredRole === 'manager' && userDetails?.role === 'admin')) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading message="Loading application..." />;
  }

  return (
    <Routes>
      {/* Auth routes */}
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" /> : <LoginPage />} 
      />
      
      {/* Landing page redirect */}
      <Route 
        path="/" 
        element={<Navigate to={user ? "/dashboard" : "/login"} />} 
      />
      
      <Route 
        path="/index" 
        element={<Navigate to="/" />} 
      />

      {/* Protected routes with layout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={
          <ProtectedRoute requiredRole="manager">
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/time-tracker" element={<TimeTrackerPage />} />
        <Route path="/time-reports" element={<TimeReportsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/screenshots" element={<ScreenshotsPage />} />
        <Route path="/settings" element={
          <ProtectedRoute requiredRole="admin">
            <SettingsPage />
          </ProtectedRoute>
        } />
      </Route>

      {/* 404 Not Found */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
