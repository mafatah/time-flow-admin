
import { Sidebar } from "./sidebar";
import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  className?: string;
}

export function MainLayout({ className }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <main className={cn("container py-6", className)}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
