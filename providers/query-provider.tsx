"use client";

import { type ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUserStore } from "@/store/user-store";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // API failures are business outcomes (400/403/409) or a real fault
          // the user should see at once — retrying would only delay them.
          queries: { retry: false, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );

  // The persisted mock user is read after hydration so the server HTML and
  // the first client render match.
  useEffect(() => {
    void useUserStore.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
