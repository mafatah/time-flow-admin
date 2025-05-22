"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectStatsCard = ProjectStatsCard;
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
    return (<card_1.Card className={className}>
      <card_1.CardHeader className="pb-2">
        <card_1.CardTitle>Project Statistics</card_1.CardTitle>
        <card_1.CardDescription>Time spent on projects</card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent>
        {projectData.length === 0 ? (<div className="flex justify-center py-8 text-muted-foreground">
            No project data available
          </div>) : (<div className="space-y-4">
            {projectData.map((project) => (<div key={project.id || project.name}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{project.name}</p>
                  <p className="text-sm text-muted-foreground">{project.timeSpentHours.toFixed(1)}h</p>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{
                    width: `${Math.min(project.timeSpentHours / 40 * 100, 100)}%`
                }}/>
                </div>
              </div>))}
          </div>)}
      </card_1.CardContent>
    </card_1.Card>);
}
