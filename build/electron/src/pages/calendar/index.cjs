"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CalendarPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const page_header_1 = require("@/components/layout/page-header");
function CalendarPage() {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)(page_header_1.PageHeader, { title: "Calendar", subtitle: "Coming soon" }), (0, jsx_runtime_1.jsx)("p", { className: "text-muted-foreground", children: "This page is under construction." })] }));
}
