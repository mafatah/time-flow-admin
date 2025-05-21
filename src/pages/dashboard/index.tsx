
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
import { Tables } from "@/integrations/supabase/types";
import { Clock, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const { user, userDetails } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [todayTimeMs, setTodayTimeMs] = useState(0);
  const [weekTimeMs, setWeekTimeMs] = useState(0);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<{ name: string; activity: number }[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("*");
        
        if (projectsError) throw projectsError;
        
        // Fetch active users with their current tasks
        const { data: activeUsersData, error: activeUsersError } = await supabase
          .from("time_logs")
          .select(`
            id,
            start_time,
            users:user_id(id, full_name, email, role, avatar_url),
            tasks:task_id(id, name, project_id)
          `)
          .is("end_time", null)
          .order("start_time", { ascending: false });
        
        if (activeUsersError) throw activeUsersError;
        
        // Calculate today's time for current user
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: todayLogs, error: todayLogsError } = await supabase
          .from("time_logs")
          .select("start_time, end_time")
          .eq("user_id", user?.id)
          .gte("start_time", today.toISOString())
          .order("start_time", { ascending: false });
        
        if (todayLogsError) throw todayLogsError;
        
        // Calculate week's time for current user
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const { data: weekLogs, error: weekLogsError } = await supabase
          .from("time_logs")
          .select("start_time, end_time")
          .eq("user_id", user?.id)
          .gte("start_time", weekStart.toISOString())
          .order("start_time", { ascending: false });
        
        if (weekLogsError) throw weekLogsError;
        
        // Calculate activity data (mock for now)
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const activityByDay = dayNames.map(name => ({
          name,
          activity: Math.floor(Math.random() * 100)
        }));
        
        // Calculate time durations
        let todayDuration = 0;
        let weekDuration = 0;
        
        todayLogs?.forEach(log => {
          const start = new Date(log.start_time).getTime();
          const end = log.end_time ? new Date(log.end_time).getTime() : Date.now();
          todayDuration += end - start;
        });
        
        weekLogs?.forEach(log => {
          const start = new Date(log.start_time).getTime();
          const end = log.end_time ? new Date(log.end_time).getTime() : Date.now();
          weekDuration += end - start;
        });
        
        // Prepare projects data with additional stats
        const formattedProjects = projectsData?.map(project => {
          // In a real app, we'd fetch actual task counts and time spent
          return {
            ...project,
            taskCount: Math.floor(Math.random() * 20) + 1,
            completedTaskCount: Math.floor(Math.random() * 10),
            timeSpentHours: Math.random() * 50
          };
        });
        
        setTodayTimeMs(todayDuration);
        setWeekTimeMs(weekDuration);
        setActiveUsers(activeUsersData || []);
        setActivityData(activityByDay);
        setProjects(formattedProjects || []);

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
        toast({
          title: "Error",
          description: err.message || "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchDashboardData();
    }
  }, [user, toast]);

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
          previous={todayTimeMs * 0.9} 
          icon={<Clock className="h-4 w-4" />}
        />
        <TimeSummaryCard 
          title="This Week" 
          duration={weekTimeMs} 
          previous={weekTimeMs * 0.95} 
          icon={<Calendar className="h-4 w-4" />}
        />
        <TimeSummaryCard 
          title="Average Daily" 
          duration={weekTimeMs / 7} 
          previous={(weekTimeMs / 7) * 0.98} 
        />
        <TimeSummaryCard 
          title="Productivity Score" 
          duration={0} 
          showComparison={false} 
          scoreValue={85}
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
