"use client";

import type { Equipment } from "@/api-client/rooms";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDashboardStore } from "@/store/dashboard-store";

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  PROJECTOR: "Projector",
  COMPUTERS: "Computers",
  WHITEBOARD: "Whiteboard",
};

/** Rooms must have every selected item (BOOK-22); nothing selected = all. */
export function EquipmentFilter() {
  const equipment = useDashboardStore((state) => state.equipment);
  const setEquipment = useDashboardStore((state) => state.setEquipment);

  return (
    <div className="space-y-1">
      <Label id="equipment-label">Equipment</Label>
      <ToggleGroup
        aria-labelledby="equipment-label"
        multiple
        variant="outline"
        size="sm"
        spacing={1}
        value={equipment}
        onValueChange={(value) => setEquipment(value as Equipment[])}
      >
        {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((item) => (
          <ToggleGroupItem key={item} value={item}>
            {EQUIPMENT_LABELS[item]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
