"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProjectsPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const tabs_1 = require("@/components/ui/tabs");
const project_management_1 = __importDefault(require("./project-management"));
const tasks_management_1 = __importDefault(require("./tasks-management"));
function ProjectsPage() {
    return ((0, jsx_runtime_1.jsxs)(tabs_1.Tabs, { defaultValue: "projects", children: [(0, jsx_runtime_1.jsxs)(tabs_1.TabsList, { className: "mb-4", children: [(0, jsx_runtime_1.jsx)(tabs_1.TabsTrigger, { value: "projects", children: "Projects" }), (0, jsx_runtime_1.jsx)(tabs_1.TabsTrigger, { value: "tasks", children: "Tasks" })] }), (0, jsx_runtime_1.jsx)(tabs_1.TabsContent, { value: "projects", children: (0, jsx_runtime_1.jsx)(project_management_1.default, {}) }), (0, jsx_runtime_1.jsx)(tabs_1.TabsContent, { value: "tasks", children: (0, jsx_runtime_1.jsx)(tasks_management_1.default, {}) })] }));
}
