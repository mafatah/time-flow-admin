"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectStatsCard = ProjectStatsCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const card_1 = require("@/components/ui/card");
function ProjectStatsCard({ projects, className }) {
    // For now, we'll adapt to use simpler data format until we update all components
    const projectData = projects.map(project => {
        if ('hours' in project) {
            // Handle simplified format from dashboard
            return {
                id: project.id || project.name,
                name: project.name,
                taskCount: 1,
                completedTaskCount: 0,
                timeSpentHours: project.hours || 0,
            };
        }
        return project;
    });
    return ((0, jsx_runtime_1.jsxs)(card_1.Card, { className: className, children: [(0, jsx_runtime_1.jsxs)(card_1.CardHeader, { className: "pb-2", children: [(0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Project Statistics" }), (0, jsx_runtime_1.jsx)(card_1.CardDescription, { children: "Time spent on projects" })] }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: projectData.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center py-8 text-muted-foreground", children: "No project data available" })) : ((0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: projectData.map((project) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium", children: project.name }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-muted-foreground", children: [project.timeSpentHours.toFixed(1), "h"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 h-2 w-full rounded-full bg-muted", children: (0, jsx_runtime_1.jsx)("div", { className: "h-full rounded-full bg-primary", style: {
                                        width: `${Math.min(project.timeSpentHours / 40 * 100, 100)}%`
                                    } }) })] }, project.id || project.name))) })) })] }));
}
