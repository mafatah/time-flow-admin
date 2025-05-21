
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectManagement from "./project-management";
import TasksManagement from "./tasks-management";

export default function ProjectsPage() {
  return (
    <Tabs defaultValue="projects">
      <TabsList className="mb-4">
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
      </TabsList>
      <TabsContent value="projects">
        <ProjectManagement />
      </TabsContent>
      <TabsContent value="tasks">
        <TasksManagement />
      </TabsContent>
    </Tabs>
  );
}
