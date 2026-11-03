"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDashboardStore } from "@/store/dashboard-store";
import { MOCK_USERS, type MockUser, useUserStore } from "@/store/user-store";

/** Picks the mock user sent as x-user-id (ADR-002). */
export function UserSwitcher() {
  const userId = useUserStore((state) => state.userId);
  const setUserId = useUserStore((state) => state.setUserId);
  const setNotice = useDashboardStore((state) => state.setNotice);

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Acting as (x-user-id)</p>
      <ToggleGroup
        aria-label="Mock user"
        variant="outline"
        size="sm"
        spacing={1}
        value={[userId]}
        onValueChange={(value) => {
          // Pressing the active user again would empty the group; keep it.
          const next = value[0] as MockUser["id"] | undefined;
          if (!next) return;
          setUserId(next);
          setNotice(null);
        }}
      >
        {MOCK_USERS.map((user) => (
          <ToggleGroupItem key={user.id} value={user.id}>
            {user.name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
