
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tables } from "@/types/database";

interface ProjectWithStats extends Tables<"projects"> {
  taskCount: number;
  completedTaskCount: number;
  timeSpentHours: number;
}

interface ProjectStatsCardProps {
  projects: ProjectWithStats[];
}

export function ProjectStatsCard({ projects }: ProjectStatsCardProps) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Active Projects</CardTitle>
        <CardDescription>
          Project progress and time statistics
        </CardDescription>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <p>No active projects</p>
          </div>
        ) : (
          <div className="space-y-5">
            {projects.map((project) => {
              const progressPercentage = project.taskCount > 0
                ? Math.round((project.completedTaskCount / project.taskCount) * 100)
                : 0;
              
              return (
                <div key={project.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.timeSpentHours.toFixed(1)} hours spent
                      </p>
                    </div>
                    <p className="text-sm font-medium">{progressPercentage}%</p>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
