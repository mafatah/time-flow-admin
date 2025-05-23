"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NotFoundPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const button_1 = require("@/components/ui/button");
const react_router_dom_1 = require("react-router-dom");
function NotFoundPage() {
    return ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-col items-center justify-center min-h-screen bg-background p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "text-center", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-9xl font-bold text-primary", children: "404" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-3xl font-semibold mt-4", children: "Page Not Found" }), (0, jsx_runtime_1.jsx)("p", { className: "text-muted-foreground mt-2 mb-6", children: "The page you are looking for doesn't exist or has been moved." }), (0, jsx_runtime_1.jsx)(button_1.Button, { asChild: true, children: (0, jsx_runtime_1.jsx)(react_router_dom_1.Link, { to: "/", children: "Return to Dashboard" }) })] }) }));
}
