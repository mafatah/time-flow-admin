"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminDashboard;
const jsx_runtime_1 = require("react/jsx-runtime");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const page_header_1 = require("@/components/layout/page-header");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
function AdminDashboard() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const adminTools = [
        {
            title: "Screenshot Monitoring",
            description: "View user screenshots and activity tracking",
            icon: lucide_react_1.Camera,
            path: "/admin/screenshots",
            color: "bg-blue-500"
        },
        {
            title: "Idle Time Logs",
            description: "Monitor user idle periods and productivity",
            icon: lucide_react_1.Clock,
            path: "/admin/idle-logs",
            color: "bg-orange-500"
        },
        {
            title: "User Management",
            description: "Manage users and access roles",
            icon: lucide_react_1.Users,
            path: "/users",
            color: "bg-green-500"
        },
        {
            title: "Project Management",
            description: "Manage projects and tasks",
            icon: lucide_react_1.Briefcase,
            path: "/projects",
            color: "bg-purple-500"
        }
    ];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "container py-6", children: [(0, jsx_runtime_1.jsx)(page_header_1.PageHeader, { title: "Admin Dashboard", subtitle: "Monitor and manage your team's productivity" }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6", children: adminTools.map((tool) => ((0, jsx_runtime_1.jsxs)(card_1.Card, { className: "hover:shadow-lg transition-shadow cursor-pointer", children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { className: "pb-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: `p-2 rounded-lg ${tool.color} text-white`, children: (0, jsx_runtime_1.jsx)(tool.icon, { className: "h-6 w-6" }) }), (0, jsx_runtime_1.jsx)(card_1.CardTitle, { className: "text-lg", children: tool.title })] }) }), (0, jsx_runtime_1.jsxs)(card_1.CardContent, { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-muted-foreground mb-4", children: tool.description }), (0, jsx_runtime_1.jsxs)(button_1.Button, { onClick: () => navigate(tool.path), className: "w-full", children: ["Access ", tool.title] })] })] }, tool.path))) })] }));
}
