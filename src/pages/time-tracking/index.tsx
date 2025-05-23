import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { Timer, Calendar } from "lucide-react";
import TimeTracker from "./time-tracker";
import TimeLogs from "./time-logs";

export default function TimeTrackingPage() {
  return (
    <div className="container py-6">
      <PageHeader
        title="Time Tracking"
        subtitle="Track time spent on tasks and projects"
      />

      <Tabs defaultValue="tracker" className="mt-6">
        <TabsList>
          <TabsTrigger value="tracker" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Time Tracker
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Time Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracker" className="space-y-6">
          <TimeTracker />
        </TabsContent>

        <TabsContent value="logs">
          <TimeLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
