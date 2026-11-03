import { create } from "zustand";
import type { Interval } from "@/api-client/rooms";
import type { ApiErrorView } from "@/lib/api-error";
import { kyivToday, kyivToUtcIso } from "@/lib/kyiv-time";

export type Notice =
  | { kind: "success"; text: string }
  | { kind: "error"; error: ApiErrorView };

/**
 * Dashboard UI state shared by sibling blocks: the Kyiv-time interval the
 * picker edits and the rooms table queries, and the last action's notice.
 */
interface DashboardStore {
  date: string;
  startTime: string;
  endTime: string;
  notice: Notice | null;
  setDate: (date: string) => void;
  setStartTime: (time: string) => void;
  setEndTime: (time: string) => void;
  setNotice: (notice: Notice | null) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  date: kyivToday(new Date()),
  startTime: "10:00",
  endTime: "11:00",
  notice: null,
  setDate: (date) => set({ date }),
  setStartTime: (startTime) => set({ startTime }),
  setEndTime: (endTime) => set({ endTime }),
  setNotice: (notice) => set({ notice }),
}));

/** The picked interval as UTC ISO bounds, or null while it is incomplete. */
export function useInterval(): Interval | null {
  const date = useDashboardStore((state) => state.date);
  const startTime = useDashboardStore((state) => state.startTime);
  const endTime = useDashboardStore((state) => state.endTime);

  const startIso = kyivToUtcIso(date, startTime);
  const endIso = kyivToUtcIso(date, endTime);
  return startIso && endIso ? { startTime: startIso, endTime: endIso } : null;
}
