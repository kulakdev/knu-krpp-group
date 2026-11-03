"use client";

import { ErrorBox } from "@/app/components/error-box";
import { useDashboardStore } from "@/store/dashboard-store";

/** Outcome of the last book / cancel action. */
export function Notice() {
  const notice = useDashboardStore((state) => state.notice);

  if (notice?.kind === "success") {
    return (
      <p
        role="status"
        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
      >
        {notice.text}
      </p>
    );
  }
  return notice?.kind === "error" ? <ErrorBox error={notice.error} /> : null;
}
