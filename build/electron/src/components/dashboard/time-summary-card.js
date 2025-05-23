"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeSummaryCard = TimeSummaryCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const card_1 = require("@/components/ui/card");
const lucide_react_1 = require("lucide-react");
function TimeSummaryCard({ title, duration, previous, icon = (0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { className: "h-4 w-4" }), showComparison = true, scoreValue, className, }) {
    const durationText = scoreValue !== undefined ? `${scoreValue}%` : formatDuration(duration);
    // Calculate percentage change
    const percentageChange = previous && previous > 0
        ? ((duration - previous) / previous) * 100
        : 0;
    return ((0, jsx_runtime_1.jsxs)(card_1.Card, { className: className, children: [(0, jsx_runtime_1.jsxs)(card_1.CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [(0, jsx_runtime_1.jsx)(card_1.CardTitle, { className: "text-sm font-medium", children: title }), (0, jsx_runtime_1.jsx)("div", { className: "h-4 w-4 text-muted-foreground", children: icon })] }), (0, jsx_runtime_1.jsxs)(card_1.CardContent, { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-2xl font-bold", children: durationText }), showComparison && previous !== undefined && ((0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-muted-foreground", children: [percentageChange > 0 ? "+" : "", percentageChange.toFixed(1), "% from previous period"] }))] })] }));
}
// Utility function to format duration in hours/minutes
function formatDuration(durationInHours) {
    const hours = Math.floor(durationInHours);
    const minutes = Math.floor((durationInHours - hours) * 60);
    if (hours === 0) {
        return `${minutes}m`;
    }
    else if (minutes === 0) {
        return `${hours}h`;
    }
    else {
        return `${hours}h ${minutes}m`;
    }
}
