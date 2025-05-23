"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveUsersCard = ActiveUsersCard;
const jsx_runtime_1 = require("react/jsx-runtime");
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
    return ((0, jsx_runtime_1.jsxs)(card_1.Card, { className: className, children: [(0, jsx_runtime_1.jsxs)(card_1.CardHeader, { className: "pb-2", children: [(0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Active Now" }), (0, jsx_runtime_1.jsx)(card_1.CardDescription, { children: users.length === 0
                            ? "No users currently active"
                            : `${users.length} users currently working` })] }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: users.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center py-6 text-muted-foreground", children: (0, jsx_runtime_1.jsx)("p", { children: "No active users at this time" }) })) : ((0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: users.map((user) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center", children: [(0, jsx_runtime_1.jsx)(avatar_1.Avatar, { className: "h-9 w-9", children: (0, jsx_runtime_1.jsx)(avatar_1.AvatarFallback, { className: "bg-primary/10 text-primary", children: getInitials(user.name) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "ml-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium leading-none", children: user.name }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-muted-foreground mt-1", children: ["Working on: ", user.task] })] }), (0, jsx_runtime_1.jsx)("div", { className: "ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-green-100", children: (0, jsx_runtime_1.jsx)("div", { className: "h-2 w-2 rounded-full bg-green-600" }) })] }, user.id))) })) })] }));
}
