
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Clock,
  Activity,
  TrendingUp,
  FolderOpen,
  Users,
  Settings,
  Calendar,
  Camera,
  FileText
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const sidebarItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Timesheets",
    icon: Clock,
    href: "/timesheets",
  },
  {
    title: "Activity",
    icon: Activity,
    href: "/activity",
  },
  {
    title: "Insights",
    icon: TrendingUp,
    href: "/insights",
  },
  {
    title: "Projects",
    icon: FolderOpen,
    href: "/projects",
  },
  {
    title: "People",
    icon: Users,
    href: "/people",
  },
  {
    title: "Calendar",
    icon: Calendar,
    href: "/calendar",
  },
  {
    title: "Screenshots",
    icon: Camera,
    href: "/screenshots",
  },
  {
    title: "Reports",
    icon: FileText,
    href: "/reports",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/admin-settings",
  },
];

interface EnhancedSidebarProps {
  className?: string;
}

export function EnhancedSidebar({ className }: EnhancedSidebarProps) {
  const location = useLocation();

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Employee Tracker
          </h2>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="space-y-1">
              {sidebarItems.map((item) => (
                <Button
                  key={item.href}
                  variant={location.pathname === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link to={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Link>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
