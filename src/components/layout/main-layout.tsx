
import { Sidebar } from "./sidebar";
import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  className?: string;
}

export function MainLayout({ className }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <main className={cn("w-full min-h-screen", className)}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
