"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sidebar = Sidebar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const button_1 = require("@/components/ui/button");
const utils_1 = require("@/lib/utils");
const auth_provider_1 = require("@/providers/auth-provider");
const utils_2 = require("@/lib/utils");
const lucide_react_1 = require("lucide-react");
const avatar_1 = require("@/components/ui/avatar");
const utils_3 = require("@/lib/utils");
function Sidebar({ className }) {
    const { userDetails, signOut } = (0, auth_provider_1.useAuth)();
    const location = (0, react_router_dom_1.useLocation)();
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    // Define sidebar items based on user role
    const sidebarItems = [
        {
            title: "Dashboard",
            href: "/",
            icon: lucide_react_1.LayoutDashboard,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER, utils_2.UserRole.EMPLOYEE],
        },
        {
            title: "Users",
            href: "/users",
            icon: lucide_react_1.Users,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER],
        },
        {
            title: "Projects",
            href: "/projects",
            icon: lucide_react_1.Layout,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER, utils_2.UserRole.EMPLOYEE],
        },
        {
            title: "Time Tracking",
            href: "/time-tracking",
            icon: lucide_react_1.Clock,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER, utils_2.UserRole.EMPLOYEE],
        },
        {
            title: "Calendar",
            href: "/calendar",
            icon: lucide_react_1.Calendar,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER, utils_2.UserRole.EMPLOYEE],
        },
        {
            title: "Screenshots",
            href: "/screenshots",
            icon: lucide_react_1.Image,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER],
        },
        {
            title: "Reports",
            href: "/reports",
            icon: lucide_react_1.FileText,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER, utils_2.UserRole.EMPLOYEE],
        },
        {
            title: "Settings",
            href: "/settings",
            icon: lucide_react_1.Settings,
            roles: [utils_2.UserRole.ADMIN],
        },
    ];
    // Filter items based on user role
    const filteredItems = userDetails
        ? sidebarItems.filter((item) => item.roles.includes(userDetails.role))
        : [];
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "lg:hidden fixed top-4 left-4 z-50", children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", size: "icon", onClick: () => setIsOpen(!isOpen), className: "bg-background", children: isOpen ? (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Menu, { size: 20 }) }) }), (0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)("fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0", isOpen ? "translate-x-0" : "-translate-x-full", className), children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-full", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-4", children: (0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold text-primary", children: "TrackHub" }) }), (0, jsx_runtime_1.jsx)("div", { className: "px-3 py-2", children: (0, jsx_runtime_1.jsx)("nav", { className: "space-y-1", children: filteredItems.map((item) => ((0, jsx_runtime_1.jsxs)(react_router_dom_1.Link, { to: item.href, className: (0, utils_1.cn)("flex items-center px-3 py-2 text-sm font-medium rounded-md", location.pathname === item.href
                                        ? "bg-primary text-primary-foreground"
                                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"), onClick: () => setIsOpen(false), children: [(0, jsx_runtime_1.jsx)(item.icon, { className: "mr-3 h-5 w-5" }), item.title] }, item.href))) }) }), (0, jsx_runtime_1.jsx)("div", { className: "mt-auto p-4 border-t", children: userDetails && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center", children: [(0, jsx_runtime_1.jsx)(avatar_1.Avatar, { className: "h-8 w-8", children: (0, jsx_runtime_1.jsx)(avatar_1.AvatarFallback, { children: (0, utils_3.getInitials)(userDetails.full_name) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "ml-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium", children: userDetails.full_name }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-muted-foreground", children: userDetails.email })] })] }), (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "sm", onClick: signOut, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 16 }) })] })) })] }) }), isOpen && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden", onClick: () => setIsOpen(false) }))] }));
}
