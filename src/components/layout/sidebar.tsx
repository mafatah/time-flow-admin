
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  FolderOpen, 
  Camera, 
  Settings, 
  BarChart3, 
  Calendar,
  Clock,
  Activity,
  Shield,
  UserCheck,
  Timer,
  Coffee,
  TrendingUp
} from "lucide-react";

const Sidebar = () => {
  const location = useLocation();
  const isAdminOnly = import.meta.env.VITE_ADMIN_ONLY === 'true';

  // Employee navigation items - only show if not admin-only
  const employeeNavItems = !isAdminOnly ? [
    {
      title: "Employee",
      items: [
        {
          title: "Dashboard",
          href: "/employee/dashboard",
          icon: LayoutDashboard
        },
        {
          title: "Time Tracker",
          href: "/employee/time-tracker",
          icon: Timer
        },
        {
          title: "Reports",
          href: "/employee/reports",
          icon: BarChart3
        },
        {
          title: "Idle Time",
          href: "/employee/idle-time",
          icon: Coffee
        }
      ]
    }
  ] : [];

  // Admin navigation items - always available
  const adminNavItems = [
    {
      title: "Admin",
      items: [
        {
          title: "Dashboard",
          href: "/admin",
          icon: Shield
        },
        {
          title: "Users",
          href: "/users",
          icon: Users
        },
        {
          title: "Projects",
          href: "/projects",
          icon: FolderOpen
        }
      ]
    },
    {
      title: "Management",
      items: [
        {
          title: "Time Tracking",
          href: "/time-tracking",
          icon: Clock
        },
        {
          title: "Screenshots",
          href: "/screenshots",
          icon: Camera
        },
        {
          title: "Calendar",
          href: "/calendar",
          icon: Calendar
        }
      ]
    },
    {
      title: "Reports",
      items: [
        {
          title: "Analytics",
          href: "/reports",
          icon: BarChart3
        },
        {
          title: "Time Reports",
          href: "/time-reports",
          icon: Activity
        },
        {
          title: "Apps & URLs",
          href: "/reports/apps-urls-idle",
          icon: TrendingUp
        },
        {
          title: "Insights",
          href: "/insights",
          icon: UserCheck
        }
      ]
    },
    {
      title: "System",
      items: [
        {
          title: "Settings",
          href: "/settings",
          icon: Settings
        }
      ]
    }
  ];

  // Combine navigation items
  const allNavItems = [...employeeNavItems, ...adminNavItems];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">TimeFlow</h1>
        <p className="text-sm text-gray-600 mt-1">Employee Tracking</p>
      </div>
      
      <nav className="px-4 space-y-6">
        {allNavItems.map((section) => (
          <div key={section.title}>
            <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
};

export { Sidebar };
