"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Loading = Loading;
const jsx_runtime_1 = require("react/jsx-runtime");
const lucide_react_1 = require("lucide-react");
function Loading({ message = "Loading..." }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center min-h-[400px]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, { className: "h-8 w-8 animate-spin text-primary" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-4 text-muted-foreground", children: message })] }));
}
