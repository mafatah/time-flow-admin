"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProjectsPage;
const tabs_1 = require("@/components/ui/tabs");
const project_management_1 = __importDefault(require("./project-management"));
const tasks_management_1 = __importDefault(require("./tasks-management"));
function ProjectsPage() {
    return (<tabs_1.Tabs defaultValue="projects">
      <tabs_1.TabsList className="mb-4">
        <tabs_1.TabsTrigger value="projects">Projects</tabs_1.TabsTrigger>
        <tabs_1.TabsTrigger value="tasks">Tasks</tabs_1.TabsTrigger>
      </tabs_1.TabsList>
      <tabs_1.TabsContent value="projects">
        <project_management_1.default />
      </tabs_1.TabsContent>
      <tabs_1.TabsContent value="tasks">
        <tasks_management_1.default />
      </tabs_1.TabsContent>
    </tabs_1.Tabs>);
}
