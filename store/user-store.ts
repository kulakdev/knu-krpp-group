import { create } from "zustand";
import { persist } from "zustand/middleware";

// Mirrors prisma/seed.ts; mock auth only (ADR-002).
export const MOCK_USERS = [
  { id: "student-1", name: "Alex Student", role: "Student" },
  { id: "student-2", name: "Maria Student", role: "Student" },
  { id: "admin-1", name: "Admin User", role: "Admin" },
] as const;

export type MockUser = (typeof MOCK_USERS)[number];

interface UserStore {
  userId: MockUser["id"];
  setUserId: (userId: MockUser["id"]) => void;
}

/** The mock user sent as x-user-id; persisted and shared by all pages. */
export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      userId: MOCK_USERS[0].id,
      setUserId: (userId) => set({ userId }),
    }),
    // Rehydrated by QueryProvider after mount to avoid a hydration mismatch.
    { name: "mock-user", skipHydration: true },
  ),
);

export function useCurrentUser(): MockUser {
  const userId = useUserStore((state) => state.userId);
  return MOCK_USERS.find((user) => user.id === userId) ?? MOCK_USERS[0];
}
