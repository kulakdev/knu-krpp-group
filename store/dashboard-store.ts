import { create } from "zustand";
import type { Equipment, Interval } from "@/api-client/rooms";
import type { ApiErrorView } from "@/lib/api-error";
import { kyivToday, kyivToUtcIso } from "@/lib/kyiv-time";

export type Notice =
  | { kind: "success"; text: string }
  | { kind: "error"; error: ApiErrorView };

/**
 * Dashboard UI state shared by sibling blocks: the Kyiv-time interval and
 * equipment filter the pickers edit and the rooms table queries, and the
 * last action's notice.
 */
interface DashboardStore {
  date: string;
  startTime: string;
  endTime: string;
  equipment: Equipment[];
  notice: Notice | null;
  setDate: (date: string) => void;
  setStartTime: (time: string) => void;
  setEndTime: (time: string) => void;
  setEquipment: (equipment: Equipment[]) => void;
  setNotice: (notice: Notice | null) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  date: kyivToday(new Date()),
  startTime: "10:00",
  endTime: "11:00",
  equipment: [],
  notice: null,
  setDate: (date) => set({ date }),
  setStartTime: (startTime) => set({ startTime }),
  setEndTime: (endTime) => set({ endTime }),
  setEquipment: (equipment) => set({ equipment }),
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
