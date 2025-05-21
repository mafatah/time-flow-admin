
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Tables } from "@/types/database";

interface ActiveUsersCardProps {
  activeUsers: {
    user: Tables<"users">;
    task: Tables<"tasks">;
    startTime: string;
  }[];
}

export function ActiveUsersCard({ activeUsers }: ActiveUsersCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Active Now</CardTitle>
        <CardDescription>
          {activeUsers.length === 0
            ? "No users currently active"
            : `${activeUsers.length} users currently working`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeUsers.length === 0 ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <p>No active users at this time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeUsers.map((activeUser) => (
              <div key={activeUser.user.id} className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(activeUser.user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium leading-none">
                    {activeUser.user.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Working on: {activeUser.task.name}
                  </p>
                </div>
                <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <div className="h-2 w-2 rounded-full bg-green-600"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
