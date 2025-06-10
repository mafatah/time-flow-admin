import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import EbdaaTimeLogo from "@/components/ui/timeflow-logo";
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
  TrendingUp,
  LogOut,
  Monitor,
  Globe,
  DollarSign,
  AlertTriangle,
  User,
  ChevronRight,
  Home,
  ClipboardList,
  Eye,
  FileText,
  Target,
  PieChart,
  MousePointer,
  Keyboard,
  BookOpen,
  Briefcase
} from "lucide-react";

const Sidebar = () => {
  const location = useLocation();
  const { userDetails, signOut } = useAuth();
  
  // Debug logging
  console.log('🔍 Sidebar Debug:', {
    currentPath: location.pathname,
    userDetails: userDetails,
    userRole: userDetails?.role
  });
  
  // Determine user role
  const userRole = userDetails?.role || 'employee';
  const isAdmin = userRole === 'admin' || userRole === 'manager';
  const isEmployee = userRole === 'employee';

  // Employee navigation items - better organized
  const employeeNavItems = isEmployee ? [
    {
      title: "WORKSPACE",
      items: [
        {
          title: "Dashboard",
          href: "/employee",
          icon: Home,
          description: "Overview & stats"
        },
        {
          title: "Time Tracker",
          href: "/employee/time-tracker",
          icon: Timer,
          description: "Track your work time"
        }
      ]
    },
    {
      title: "REPORTS",
      items: [
        {
          title: "My Reports",
          href: "/employee/reports",
          icon: FileText,
          description: "View your activity reports"
        }
        // TODO: Add idle time page when implemented
        // {
        //   title: "Idle Time",
        //   href: "/employee/idle-time",
        //   icon: Coffee,
        //   description: "Track idle periods"
        // }
      ]
    }
  ] : [];

  // Admin navigation items - improved grouping and organization
  const adminNavItems = isAdmin ? [
    {
      title: "CORE MANAGEMENT",
      items: [
        {
          title: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          description: "Main overview"
        },
        {
          title: "Users",
          href: "/users",
          icon: Users,
          description: "Manage employees"
        },
        {
          title: "Projects",
          href: "/projects",
          icon: Briefcase,
          description: "Project management"
        }
      ]
    },
    {
      title: "TIME MANAGEMENT",
      items: [
        {
          title: "Time Tracking",
          href: "/time-tracking",
          icon: Clock,
          description: "Active time tracking"
        },
        {
          title: "Time Logs",
          href: "/time-logs",
          icon: ClipboardList,
          description: "Historical time data"
        },
        {
          title: "Calendar",
          href: "/calendar",
          icon: Calendar,
          description: "Schedule overview"
        }
      ]
    },
    {
      title: "ACTIVITY MONITORING",
      items: [
        {
          title: "Screenshots",
          href: "/screenshots",
          icon: Camera,
          description: "Screen captures"
        },
        {
          title: "App Activity",
          href: "/reports/apps-urls-idle",
          icon: Monitor,
          description: "Apps & URL tracking"
        },
        {
          title: "Suspicious Activity",
          href: "/suspicious-activity",
          icon: AlertTriangle,
          description: "Security alerts"
        }
      ]
    },
    {
      title: "ANALYTICS & INSIGHTS",
      items: [
        {
          title: "Productivity Insights", 
          href: "/insights",
          icon: TrendingUp,
          description: "Performance analytics"
        },
        {
          title: "Detailed Reports",
          href: "/reports",
          icon: BarChart3,
          description: "Comprehensive analytics"
        },
        {
          title: "All Employee Report",
          href: "/reports/all-employee",
          icon: FileText,
          description: "Daily hours breakdown"
        },
        {
          title: "Individual Report",
          href: "/reports/individual-employee",
          icon: User,
          description: "Detailed employee sessions"
        },
        {
          title: "Time Reports",
          href: "/reports/time-reports",
          icon: Activity,
          description: "Time analysis"
        }
      ]
    },
    {
      title: "ADMINISTRATION",
      items: [
        {
          title: "Employee Settings",
          href: "/employee-settings",
          icon: UserCheck,
          description: "Employee configuration"
        },
        {
          title: "Finance & Payroll",
          href: "/finance",
          icon: DollarSign,
          description: "Financial management"
        },
        {
          title: "System Settings",
          href: "/settings",
          icon: Settings,
          description: "Global configuration"
        }
      ]
    }
  ] : [];

  // Combine navigation items based on role
  const allNavItems = [...employeeNavItems, ...adminNavItems];

  return (
    <div className="w-72 bg-gradient-to-b from-slate-50 to-white border-r border-gray-200 h-screen overflow-y-auto fixed left-0 top-0 z-50 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center mb-3">
          <EbdaaTimeLogo size={36} />
          <div className="ml-3">
            <h1 className="text-xl font-bold text-gray-900">TimeFlow</h1>
            <p className="text-sm text-blue-600 font-medium">
              {isAdmin ? 'Admin Console' : 'Employee Portal'}
            </p>
          </div>
        </div>
        {userDetails && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-sm font-medium text-gray-900">
              {userDetails.full_name}
            </p>
            <p className="text-xs text-blue-600 capitalize font-medium">
              {userDetails.role}
            </p>
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="px-4 py-6 space-y-8">
        {allNavItems.map((section) => (
          <div key={section.title}>
            <div className="flex items-center mb-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>
              <div className="flex-1 h-px bg-gray-200 ml-3"></div>
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative",
                      isActive
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm"
                    )}
                  >
                    <Icon className={cn(
                      "mr-3 h-5 w-5 transition-colors",
                      isActive 
                        ? "text-white" 
                        : "text-gray-500 group-hover:text-blue-600"
                    )} />
                    <div className="flex-1">
                      <div className="font-medium">{item.title}</div>
                      {item.description && (
                        <div className={cn(
                          "text-xs mt-0.5 transition-colors",
                          isActive 
                            ? "text-blue-100" 
                            : "text-gray-500 group-hover:text-blue-500"
                        )}>
                          {item.description}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-white ml-2" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        
        {/* Logout Button */}
        <div className="pt-6 border-t border-gray-200">
          <button
            onClick={signOut}
            className="w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 group"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-500 group-hover:text-red-600" />
            <div>
              <div className="font-medium">Sign Out</div>
              <div className="text-xs text-red-500 group-hover:text-red-600">
                End session
              </div>
            </div>
          </button>
        </div>
      </nav>
    </div>
  );
};

export { Sidebar };
