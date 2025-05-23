"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityChart = ActivityChart;
const jsx_runtime_1 = require("react/jsx-runtime");
const card_1 = require("@/components/ui/card");
function ActivityChart({ data, className }) {
    // Adapt data if it's in the previous format
    const chartData = data.map(item => {
        if ('hour' in item) {
            // Convert from the old format
            return {
                name: item.hour,
                activity: item.active + item.idle
            };
        }
        return item;
    });
    return ((0, jsx_runtime_1.jsxs)(card_1.Card, { className: className, children: [(0, jsx_runtime_1.jsxs)(card_1.CardHeader, { className: "pb-2", children: [(0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Today's Activity" }), (0, jsx_runtime_1.jsx)(card_1.CardDescription, { children: "Hourly activity distribution" })] }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: data.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center py-8 text-muted-foreground", children: "No activity data available" })) : ((0, jsx_runtime_1.jsx)("div", { className: "h-[200px]", children: (0, jsx_runtime_1.jsx)("div", { className: "flex h-full items-end", children: data.map((entry, index) => {
                            // Handle both data formats
                            const hour = 'hour' in entry ? entry.hour : entry.name;
                            const active = 'active' in entry ? entry.active : 0;
                            const idle = 'idle' in entry ? entry.idle : 0;
                            const activity = 'activity' in entry ? entry.activity : active + idle;
                            const height = Math.max(activity * 20, 4);
                            return ((0, jsx_runtime_1.jsxs)("div", { className: "relative flex-1 group", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute -top-6 left-0 right-0 text-center text-xs opacity-0 group-hover:opacity-100 transition-opacity", children: hour }), (0, jsx_runtime_1.jsx)("div", { className: "mx-1 flex flex-col h-full justify-end", children: activity > 0 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [idle > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "w-full bg-yellow-400 dark:bg-yellow-600", style: { height: `${(idle / activity) * height}px` } })), active > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "w-full bg-green-500 dark:bg-green-600", style: { height: `${(active / activity) * height}px` } })), !('active' in entry) && ((0, jsx_runtime_1.jsx)("div", { className: "w-full bg-blue-500 dark:bg-blue-600", style: { height: `${height}px` } }))] })) })] }, index));
                        }) }) })) }), (0, jsx_runtime_1.jsxs)("div", { className: "px-4 pb-4 flex items-center justify-center space-x-4 text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-3 w-3 rounded-full bg-green-500 dark:bg-green-600 mr-2" }), (0, jsx_runtime_1.jsx)("span", { children: "Active" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-3 w-3 rounded-full bg-yellow-400 dark:bg-yellow-600 mr-2" }), (0, jsx_runtime_1.jsx)("span", { children: "Idle" })] })] })] }));
}
