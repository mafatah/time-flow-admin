
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { UserRole } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Layout,
  LayoutDashboard,
  Users,
  Image,
  FileText,
  Menu,
  X,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { userDetails, signOut } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Define sidebar items based on user role
  const sidebarItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    },
    {
      title: "Users",
      href: "/users",
      icon: Users,
      roles: [UserRole.ADMIN, UserRole.MANAGER],
    },
    {
      title: "Projects",
      href: "/projects",
      icon: Layout,
      roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    },
    {
      title: "Time Tracking",
      href: "/time-tracking",
      icon: Clock,
      roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    },
    {
      title: "Calendar",
      href: "/calendar",
      icon: Calendar,
      roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    },
    {
      title: "Screenshots",
      href: "/screenshots",
      icon: Image,
      roles: [UserRole.ADMIN, UserRole.MANAGER],
    },
    {
      title: "Reports",
      href: "/reports",
      icon: FileText,
      roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      roles: [UserRole.ADMIN],
    },
  ];

  // Filter items based on user role
  const filteredItems = userDetails
    ? sidebarItems.filter((item) => item.roles.includes(userDetails.role as UserRole))
    : [];

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-background"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4">
            <h1 className="text-2xl font-bold text-primary">TrackHub</h1>
          </div>

          <div className="px-3 py-2">
            <nav className="space-y-1">
              {filteredItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    location.pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-4 border-t">
            {userDetails && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {getInitials(userDetails.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{userDetails.full_name}</p>
                    <p className="text-xs text-muted-foreground">{userDetails.email}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <X size={16} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
