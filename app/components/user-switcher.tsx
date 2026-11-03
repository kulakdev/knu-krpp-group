"use client";

import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/store/dashboard-store";
import { MOCK_USERS, useUserStore } from "@/store/user-store";

/** Picks the mock user sent as x-user-id (ADR-002). */
export function UserSwitcher() {
  const userId = useUserStore((state) => state.userId);
  const setUserId = useUserStore((state) => state.setUserId);
  const setNotice = useDashboardStore((state) => state.setNotice);

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Acting as (x-user-id)</p>
      <div className="flex gap-1" role="group" aria-label="Mock user">
        {MOCK_USERS.map((user) => (
          <Button
            key={user.id}
            size="sm"
            variant={user.id === userId ? "default" : "outline"}
            aria-pressed={user.id === userId}
            onClick={() => {
              setUserId(user.id);
              setNotice(null);
            }}
          >
            {user.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
