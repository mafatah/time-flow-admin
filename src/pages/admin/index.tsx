
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { useNavigate } from "react-router-dom";
import { Camera, Clock, Users, Briefcase } from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const adminTools = [
    {
      title: "Screenshot Monitoring",
      description: "View user screenshots and activity tracking",
      icon: Camera,
      path: "/admin/screenshots",
      color: "bg-blue-500"
    },
    {
      title: "Idle Time Logs",
      description: "Monitor user idle periods and productivity",
      icon: Clock,
      path: "/admin/idle-logs",
      color: "bg-orange-500"
    },
    {
      title: "User Management",
      description: "Manage users and access roles",
      icon: Users,
      path: "/users",
      color: "bg-green-500"
    },
    {
      title: "Project Management",
      description: "Manage projects and tasks",
      icon: Briefcase,
      path: "/projects",
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="container py-6">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Monitor and manage your team's productivity"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {adminTools.map((tool) => (
          <Card key={tool.path} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${tool.color} text-white`}>
                  <tool.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{tool.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{tool.description}</p>
              <Button 
                onClick={() => navigate(tool.path)}
                className="w-full"
              >
                Access {tool.title}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
