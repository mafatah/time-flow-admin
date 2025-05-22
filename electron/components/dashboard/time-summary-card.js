"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeSummaryCard = TimeSummaryCard;
const card_1 = require("@/components/ui/card");
const lucide_react_1 = require("lucide-react");
function TimeSummaryCard({ title, duration, previous, icon = <lucide_react_1.Clock className="h-4 w-4"/>, showComparison = true, scoreValue, className, }) {
    const durationText = scoreValue !== undefined ? `${scoreValue}%` : formatDuration(duration);
    // Calculate percentage change
    const percentageChange = previous && previous > 0
        ? ((duration - previous) / previous) * 100
        : 0;
    return (<card_1.Card className={className}>
      <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <card_1.CardTitle className="text-sm font-medium">{title}</card_1.CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </card_1.CardHeader>
      <card_1.CardContent>
        <div className="text-2xl font-bold">{durationText}</div>
        {showComparison && previous !== undefined && (<p className="text-xs text-muted-foreground">
            {percentageChange > 0 ? "+" : ""}
            {percentageChange.toFixed(1)}% from previous period
          </p>)}
      </card_1.CardContent>
    </card_1.Card>);
}
// Utility function to format duration in hours/minutes
function formatDuration(durationInHours) {
    const hours = Math.floor(durationInHours);
    const minutes = Math.floor((durationInHours - hours) * 60);
    if (hours === 0) {
        return `${minutes}m`;
    }
    else if (minutes === 0) {
        return `${hours}h`;
    }
    else {
        return `${hours}h ${minutes}m`;
    }
}
