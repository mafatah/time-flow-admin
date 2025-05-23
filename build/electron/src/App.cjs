"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
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
const projects_1 = __importDefault(require("@/pages/projects"));
const time_logs_1 = __importDefault(require("@/pages/time-tracking/time-logs"));
const screenshots_viewer_1 = __importDefault(require("@/pages/screenshots/screenshots-viewer"));
const calendar_1 = __importDefault(require("@/pages/calendar"));
const reports_1 = __importDefault(require("@/pages/reports"));
const settings_1 = __importDefault(require("@/pages/settings"));
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
        return (0, jsx_runtime_1.jsx)(loading_1.Loading, { message: "Authenticating..." });
    }
    if (!user) {
        return (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: "/login" });
    }
    // If a role is required, check if the user has it
    if (requiredRole && userDetails?.role !== requiredRole &&
        !(requiredRole === 'manager' && userDetails?.role === 'admin')) {
        return (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: "/dashboard" });
    }
    return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: children });
}
function AppRoutes() {
    const { user, loading } = (0, auth_provider_1.useAuth)();
    if (loading) {
        return (0, jsx_runtime_1.jsx)(loading_1.Loading, { message: "Loading application..." });
    }
    return ((0, jsx_runtime_1.jsxs)(react_router_dom_1.Routes, { children: [(0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/login", element: user ? (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: "/dashboard" }) : (0, jsx_runtime_1.jsx)(login_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/", element: (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: user ? "/dashboard" : "/login" }) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/index", element: (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: "/" }) }), (0, jsx_runtime_1.jsxs)(react_router_dom_1.Route, { path: "/", element: (0, jsx_runtime_1.jsx)(ProtectedRoute, { children: (0, jsx_runtime_1.jsx)(main_layout_1.MainLayout, {}) }), children: [(0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "dashboard", element: (0, jsx_runtime_1.jsx)(dashboard_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "users", element: (0, jsx_runtime_1.jsx)(ProtectedRoute, { requiredRole: "manager", children: (0, jsx_runtime_1.jsx)(users_management_1.default, {}) }) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "projects", element: (0, jsx_runtime_1.jsx)(projects_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "time-tracking", element: (0, jsx_runtime_1.jsx)(time_logs_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "calendar", element: (0, jsx_runtime_1.jsx)(calendar_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "reports", element: (0, jsx_runtime_1.jsx)(reports_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "screenshots", element: (0, jsx_runtime_1.jsx)(screenshots_viewer_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "settings", element: (0, jsx_runtime_1.jsx)(ProtectedRoute, { requiredRole: "admin", children: (0, jsx_runtime_1.jsx)(settings_1.default, {}) }) })] }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "*", element: (0, jsx_runtime_1.jsx)(not_found_1.default, {}) })] }));
}
const App = () => ((0, jsx_runtime_1.jsx)(react_query_1.QueryClientProvider, { client: queryClient, children: (0, jsx_runtime_1.jsx)(auth_provider_1.AuthProvider, { children: (0, jsx_runtime_1.jsxs)(tooltip_1.TooltipProvider, { children: [(0, jsx_runtime_1.jsx)(toaster_1.Toaster, {}), (0, jsx_runtime_1.jsx)(sonner_1.Toaster, {}), (0, jsx_runtime_1.jsx)(react_router_dom_1.BrowserRouter, { children: (0, jsx_runtime_1.jsx)(AppRoutes, {}) })] }) }) }));
exports.default = App;
