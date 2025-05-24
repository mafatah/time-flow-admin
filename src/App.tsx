import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/providers/auth-provider";
import { TrackerProvider } from "@/providers/tracker-provider";
import MainLayout from "@/components/layout/main-layout";
import LoginPage from "@/pages/auth/login";
import EnhancedDashboard from "@/pages/dashboard/enhanced-dashboard";
import TimesheetsPage from "@/pages/timesheets";
import ActivityPage from "@/pages/activity";
import InsightsPage from "@/pages/insights";
import ProjectsPage from "@/pages/projects";
import PeoplePage from "@/pages/people";
import AdminSettingsPage from "@/pages/admin-settings";
import CalendarPage from "@/pages/calendar";
import ScreenshotsPage from "@/pages/screenshots";
import ReportsPage from "@/pages/reports";
import NotFoundPage from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TrackerProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<EnhancedDashboard />} />
                <Route path="timesheets" element={<TimesheetsPage />} />
                <Route path="activity" element={<ActivityPage />} />
                <Route path="insights" element={<InsightsPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="people" element={<PeoplePage />} />
                <Route path="admin-settings" element={<AdminSettingsPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="screenshots" element={<ScreenshotsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Router>
        </TrackerProvider>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
