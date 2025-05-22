"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const toaster_1 = require("@/components/ui/toaster");
const sonner_1 = require("@/components/ui/sonner");
const tooltip_1 = require("@/components/ui/tooltip");
const react_query_1 = require("@tanstack/react-query");
const react_router_dom_1 = require("react-router-dom");
const auth_provider_1 = require("@/providers/auth-provider");
const main_layout_1 = require("@/components/layout/main-layout");
const loading_1 = require("@/components/layout/loading");
// Auth pages
const login_1 = __importDefault(require("@/pages/auth/login"));
// App pages
const dashboard_1 = __importDefault(require("@/pages/dashboard"));
const users_management_1 = __importDefault(require("@/pages/users/users-management"));
const project_management_1 = __importDefault(require("@/pages/projects/project-management"));
const time_logs_1 = __importDefault(require("@/pages/time-tracking/time-logs"));
const screenshots_viewer_1 = __importDefault(require("@/pages/screenshots/screenshots-viewer"));
const not_found_1 = __importDefault(require("@/pages/not-found"));
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        }
    }
});
// Protected route component
function ProtectedRoute({ children, requiredRole }) {
    const { user, userDetails, loading } = (0, auth_provider_1.useAuth)();
    if (loading) {
        return <loading_1.Loading message="Authenticating..."/>;
    }
    if (!user) {
        return <react_router_dom_1.Navigate to="/login"/>;
    }
    // If a role is required, check if the user has it
    if (requiredRole && userDetails?.role !== requiredRole &&
        !(requiredRole === 'manager' && userDetails?.role === 'admin')) {
        return <react_router_dom_1.Navigate to="/dashboard"/>;
    }
    return <>{children}</>;
}
function AppRoutes() {
    const { user, loading } = (0, auth_provider_1.useAuth)();
    if (loading) {
        return <loading_1.Loading message="Loading application..."/>;
    }
    return (<react_router_dom_1.Routes>
      {/* Auth routes */}
      <react_router_dom_1.Route path="/login" element={user ? <react_router_dom_1.Navigate to="/dashboard"/> : <login_1.default />}/>
      
      {/* Landing page redirect */}
      <react_router_dom_1.Route path="/" element={<react_router_dom_1.Navigate to={user ? "/dashboard" : "/login"}/>}/>
      
      <react_router_dom_1.Route path="/index" element={<react_router_dom_1.Navigate to="/"/>}/>

      {/* Protected routes */}
      <react_router_dom_1.Route path="/" element={<ProtectedRoute>
            <main_layout_1.MainLayout />
          </ProtectedRoute>}>
        <react_router_dom_1.Route path="dashboard" element={<dashboard_1.default />}/>
        <react_router_dom_1.Route path="users" element={<ProtectedRoute requiredRole="manager">
            <users_management_1.default />
          </ProtectedRoute>}/>
        <react_router_dom_1.Route path="projects" element={<project_management_1.default />}/>
        <react_router_dom_1.Route path="time-tracking" element={<time_logs_1.default />}/>
        <react_router_dom_1.Route path="screenshots" element={<screenshots_viewer_1.default />}/>
      </react_router_dom_1.Route>

      {/* 404 Not Found */}
      <react_router_dom_1.Route path="*" element={<not_found_1.default />}/>
    </react_router_dom_1.Routes>);
}
const App = () => (<react_query_1.QueryClientProvider client={queryClient}>
    <auth_provider_1.AuthProvider>
      <tooltip_1.TooltipProvider>
        <toaster_1.Toaster />
        <sonner_1.Toaster />
        <react_router_dom_1.BrowserRouter>
          <AppRoutes />
        </react_router_dom_1.BrowserRouter>
      </tooltip_1.TooltipProvider>
    </auth_provider_1.AuthProvider>
  </react_query_1.QueryClientProvider>);
exports.default = App;
