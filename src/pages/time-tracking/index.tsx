
import React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { TaskSelector } from "@/components/tracking/task-selector";

const TimeTrackingPage = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Time Tracking"
        subtitle="Track your work time and view your activity"
      />
      
      <TaskSelector />
      
    </div>
  );
};

export default TimeTrackingPage;
