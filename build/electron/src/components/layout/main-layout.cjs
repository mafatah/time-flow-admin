"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainLayout = MainLayout;
const jsx_runtime_1 = require("react/jsx-runtime");
const sidebar_1 = require("./sidebar.cjs");
const react_router_dom_1 = require("react-router-dom");
const utils_1 = require("@/lib/utils");
function MainLayout({ className }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "min-h-screen bg-background", children: [(0, jsx_runtime_1.jsx)(sidebar_1.Sidebar, {}), (0, jsx_runtime_1.jsx)("div", { className: "lg:pl-64", children: (0, jsx_runtime_1.jsx)("main", { className: (0, utils_1.cn)("container py-6", className), children: (0, jsx_runtime_1.jsx)(react_router_dom_1.Outlet, {}) }) })] }));
}
