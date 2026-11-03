"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboardStore } from "@/store/dashboard-store";

/** Date and from/to time in Europe/Kyiv; converted to UTC by useInterval. */
export function IntervalPicker() {
  const { date, startTime, endTime, setDate, setStartTime, setEndTime } =
    useDashboardStore();

  return (
    <div className="flex flex-wrap gap-4">
      <div className="space-y-1">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="start">From</Label>
        <Input
          id="start"
          type="time"
          step={900}
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="end">To</Label>
        <Input
          id="end"
          type="time"
          step={900}
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
        />
      </div>
    </div>
  );
}
