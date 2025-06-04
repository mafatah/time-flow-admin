import { PageHeader } from "@/components/layout/page-header";
import TimeTracker from "./time-tracker";

export default function TimeTrackingPage() {
  return (
    <div className="container py-6">
      <PageHeader
        title="Time Tracking"
        subtitle="Track time spent on tasks and projects"
      />

      <div className="mt-6">
        <TimeTracker />
      </div>
    </div>
  );
}
