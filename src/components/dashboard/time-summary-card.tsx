
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface TimeSummaryCardProps {
  title: string;
  duration: number;
  previous?: number;
  icon?: React.ReactNode;
  showComparison?: boolean;
  scoreValue?: number;
}

export function TimeSummaryCard({
  title,
  duration,
  previous,
  icon = <Clock className="h-4 w-4" />,
  showComparison = true,
  scoreValue,
}: TimeSummaryCardProps) {
  const durationText = scoreValue !== undefined ? `${scoreValue}%` : formatDuration(duration);
  
  // Calculate percentage change
  const percentageChange = previous && previous > 0 
    ? ((duration - previous) / previous) * 100
    : 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{durationText}</div>
        {showComparison && previous !== undefined && (
          <p className="text-xs text-muted-foreground">
            {percentageChange > 0 ? "+" : ""}
            {percentageChange.toFixed(1)}% from previous period
          </p>
        )}
      </CardContent>
    </Card>
  );
}
