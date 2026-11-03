"use client";

import { CircleCheck } from "lucide-react";
import { ErrorBox } from "@/app/components/error-box";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { useDashboardStore } from "@/store/dashboard-store";

/** Outcome of the last book / cancel action. */
export function Notice() {
  const notice = useDashboardStore((state) => state.notice);

  if (notice?.kind === "success") {
    return (
      // A success is announced politely, not as an alert.
      <Alert role="status">
        <CircleCheck />
        <AlertTitle>{notice.text}</AlertTitle>
      </Alert>
    );
  }
  return notice?.kind === "error" ? <ErrorBox error={notice.error} /> : null;
}
