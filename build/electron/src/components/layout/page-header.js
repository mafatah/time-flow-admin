"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageHeader = PageHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("@/lib/utils");
function PageHeader({ title, subtitle, children, className }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)("flex flex-col md:flex-row md:items-center justify-between pb-6", className), children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-3xl font-bold tracking-tight", children: title }), subtitle && ((0, jsx_runtime_1.jsx)("p", { className: "text-muted-foreground mt-1", children: subtitle }))] }), children && (0, jsx_runtime_1.jsx)("div", { className: "mt-4 md:mt-0 flex space-x-2", children: children })] }));
}
