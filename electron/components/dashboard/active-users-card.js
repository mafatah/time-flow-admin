"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveUsersCard = ActiveUsersCard;
const card_1 = require("@/components/ui/card");
const avatar_1 = require("@/components/ui/avatar");
function ActiveUsersCard({ users, className }) {
    // Get initials from name
    const getInitials = (name) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };
    return (<card_1.Card className={className}>
      <card_1.CardHeader className="pb-2">
        <card_1.CardTitle>Active Now</card_1.CardTitle>
        <card_1.CardDescription>
          {users.length === 0
            ? "No users currently active"
            : `${users.length} users currently working`}
        </card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent>
        {users.length === 0 ? (<div className="flex justify-center py-6 text-muted-foreground">
            <p>No active users at this time</p>
          </div>) : (<div className="space-y-4">
            {users.map((user) => (<div key={user.id} className="flex items-center">
                <avatar_1.Avatar className="h-9 w-9">
                  <avatar_1.AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(user.name)}
                  </avatar_1.AvatarFallback>
                </avatar_1.Avatar>
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
              </div>))}
          </div>)}
      </card_1.CardContent>
    </card_1.Card>);
}
