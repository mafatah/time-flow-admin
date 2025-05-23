
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface User {
  id: string;
  name: string;
  task: string;
  project: string;
}

export interface ActiveUsersCardProps {
  users: User[];
  className?: string;
}

export function ActiveUsersCard({ users, className }: ActiveUsersCardProps) {
  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>Active Now</CardTitle>
        <CardDescription>
          {users.length === 0
            ? "No users currently active"
            : `${users.length} users currently working`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <p>No active users at this time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium leading-none">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Working on: {user.task}
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
