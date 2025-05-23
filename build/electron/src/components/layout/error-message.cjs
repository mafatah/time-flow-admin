"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessage = ErrorMessage;
const jsx_runtime_1 = require("react/jsx-runtime");
const button_1 = require("@/components/ui/button");
const lucide_react_1 = require("lucide-react");
function ErrorMessage({ message = "Something went wrong. Please try again.", onRetry }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center min-h-[400px]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "h-8 w-8 text-destructive" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-4 text-muted-foreground", children: message }), onRetry && ((0, jsx_runtime_1.jsx)(button_1.Button, { onClick: onRetry, variant: "outline", className: "mt-4", children: "Try Again" }))] }));
}
