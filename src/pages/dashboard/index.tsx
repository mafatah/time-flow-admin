
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/layout/page-header";
import { TimeSummaryCard } from "@/components/dashboard/time-summary-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { ProjectStatsCard } from "@/components/dashboard/project-stats-card";
import { ActiveUsersCard } from "@/components/dashboard/active-users-card";
import { Loading } from "@/components/layout/loading";
import { ErrorMessage } from "@/components/layout/error-message";
import { useAuth } from "@/providers/auth-provider";
import { Tables } from "@/types/database";
import { Clock, Calendar } from "lucide-react";

export default function Dashboard() {
  const { userDetails } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [todayTimeMs, setTodayTimeMs] = useState(28800000); // 8 hours in ms
  const [weekTimeMs, setWeekTimeMs] = useState(144000000); // 40 hours in ms
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<{ name: string; activity: number }[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);
        
        // In a real app, these would be actual database queries
        // For this demo, we'll just use mock data
        
        // Mock active users
        const mockActiveUsers = [
          {
            user: { 
              id: "1", 
              full_name: "John Smith", 
              email: "john@example.com",
              role: "employee",
              avatar_url: null
            },
            task: { 
              id: "1", 
              name: "Frontend Development", 
              project_id: "1",
              user_id: "1",
              created_at: new Date().toISOString()
            },
            startTime: new Date().toISOString()
          },
          {
            user: { 
              id: "2", 
              full_name: "Emily Johnson", 
              email: "emily@example.com",
              role: "employee",
              avatar_url: null
            },
            task: { 
              id: "2", 
              name: "API Integration", 
              project_id: "1",
              user_id: "2",
              created_at: new Date().toISOString()
            },
            startTime: new Date().toISOString()
          }
        ];

        // Mock activity data
        const mockActivityData = [
          { name: "Mon", activity: 65 },
          { name: "Tue", activity: 78 },
          { name: "Wed", activity: 82 },
          { name: "Thu", activity: 75 },
          { name: "Fri", activity: 68 },
          { name: "Sat", activity: 45 },
          { name: "Sun", activity: 30 },
        ];

        // Mock projects data
        const mockProjects = [
          {
            id: "1",
            name: "Website Redesign",
            description: "Redesign the company website",
            created_at: new Date().toISOString(),
            taskCount: 12,
            completedTaskCount: 4,
            timeSpentHours: 24.5,
          },
          {
            id: "2",
            name: "Mobile App Development",
            description: "Develop a new mobile app",
            created_at: new Date().toISOString(),
            taskCount: 20,
            completedTaskCount: 15,
            timeSpentHours: 45.2,
          },
          {
            id: "3",
            name: "Marketing Campaign",
            description: "Q2 marketing campaign",
            created_at: new Date().toISOString(),
            taskCount: 8,
            completedTaskCount: 2,
            timeSpentHours: 12.8,
          }
        ];

        setActiveUsers(mockActiveUsers);
        setActivityData(mockActivityData);
        setProjects(mockProjects);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [userDetails]);

  if (loading) return <Loading message="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <>
      <PageHeader 
        title="Dashboard" 
        subtitle="Welcome back! Here's an overview of your team's activity."
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <TimeSummaryCard 
          title="Today's Time" 
          duration={todayTimeMs} 
          previous={25200000} 
          icon={<Clock className="h-4 w-4" />}
        />
        <TimeSummaryCard 
          title="This Week" 
          duration={weekTimeMs} 
          previous={136800000} 
          icon={<Calendar className="h-4 w-4" />}
        />
        <TimeSummaryCard 
          title="Average Daily" 
          duration={28800000} 
          previous={28080000} 
        />
        <TimeSummaryCard 
          title="Productivity Score" 
          duration={0} 
          showComparison={false} 
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ActivityChart data={activityData} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProjectStatsCard projects={projects} />
        <ActiveUsersCard activeUsers={activeUsers} />
      </div>
    </>
  );
}
