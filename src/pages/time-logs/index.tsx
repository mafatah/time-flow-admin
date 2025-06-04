import { PageHeader } from "@/components/layout/page-header";
import TimeLogs from "../time-tracking/time-logs";

export default function TimeLogsPage() {
  return (
    <div className="container py-6">
      <PageHeader
        title="Time Logs"
        subtitle="View and manage employee time tracking data"
      />

      <div className="mt-6">
        <TimeLogs />
      </div>
    </div>
  );
} 