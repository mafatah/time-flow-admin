import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 ml-72">
        <main className={cn("w-full min-h-screen bg-gray-50", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}

// Also export as default for compatibility
export default MainLayout;
