"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sidebar = Sidebar;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const button_1 = require("@/components/ui/button");
const utils_1 = require("@/lib/utils");
const auth_provider_1 = require("@/providers/auth-provider");
const utils_2 = require("@/lib/utils");
const lucide_react_1 = require("lucide-react");
const avatar_1 = require("@/components/ui/avatar");
const utils_3 = require("@/lib/utils");
function Sidebar({ className }) {
    const { userDetails, signOut } = (0, auth_provider_1.useAuth)();
    const location = (0, react_router_dom_1.useLocation)();
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    // Define sidebar items based on user role
    const sidebarItems = [
        {
            title: "Dashboard",
            href: "/",
            icon: lucide_react_1.LayoutDashboard,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER, utils_2.UserRole.EMPLOYEE],
        },
        {
            title: "Users",
            href: "/users",
            icon: lucide_react_1.Users,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER],
        },
        {
            title: "Projects",
            href: "/projects",
            icon: lucide_react_1.Layout,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER, utils_2.UserRole.EMPLOYEE],
        },
        {
            title: "Time Tracking",
            href: "/time-tracking",
            icon: lucide_react_1.Clock,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER, utils_2.UserRole.EMPLOYEE],
        },
        {
            title: "Calendar",
            href: "/calendar",
            icon: lucide_react_1.Calendar,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER, utils_2.UserRole.EMPLOYEE],
        },
        {
            title: "Screenshots",
            href: "/screenshots",
            icon: lucide_react_1.Image,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER],
        },
        {
            title: "Reports",
            href: "/reports",
            icon: lucide_react_1.FileText,
            roles: [utils_2.UserRole.ADMIN, utils_2.UserRole.MANAGER, utils_2.UserRole.EMPLOYEE],
        },
        {
            title: "Settings",
            href: "/settings",
            icon: lucide_react_1.Settings,
            roles: [utils_2.UserRole.ADMIN],
        },
    ];
    // Filter items based on user role
    const filteredItems = userDetails
        ? sidebarItems.filter((item) => item.roles.includes(userDetails.role))
        : [];
    return (<>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button_1.Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)} className="bg-background">
          {isOpen ? <lucide_react_1.X size={20}/> : <lucide_react_1.Menu size={20}/>}
        </button_1.Button>
      </div>

      <div className={(0, utils_1.cn)("fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0", isOpen ? "translate-x-0" : "-translate-x-full", className)}>
        <div className="flex flex-col h-full">
          <div className="p-4">
            <h1 className="text-2xl font-bold text-primary">TrackHub</h1>
          </div>

          <div className="px-3 py-2">
            <nav className="space-y-1">
              {filteredItems.map((item) => (<react_router_dom_1.Link key={item.href} to={item.href} className={(0, utils_1.cn)("flex items-center px-3 py-2 text-sm font-medium rounded-md", location.pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")} onClick={() => setIsOpen(false)}>
                  <item.icon className="mr-3 h-5 w-5"/>
                  {item.title}
                </react_router_dom_1.Link>))}
            </nav>
          </div>

          <div className="mt-auto p-4 border-t">
            {userDetails && (<div className="flex items-center justify-between">
                <div className="flex items-center">
                  <avatar_1.Avatar className="h-8 w-8">
                    <avatar_1.AvatarFallback>
                      {(0, utils_3.getInitials)(userDetails.full_name)}
                    </avatar_1.AvatarFallback>
                  </avatar_1.Avatar>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{userDetails.full_name}</p>
                    <p className="text-xs text-muted-foreground">{userDetails.email}</p>
                  </div>
                </div>
                <button_1.Button variant="ghost" size="sm" onClick={signOut}>
                  <lucide_react_1.X size={16}/>
                </button_1.Button>
              </div>)}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setIsOpen(false)}/>)}
    </>);
}
