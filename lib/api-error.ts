/**
 * Maps an API error response to what the UI shows, keeping validation,
 * conflict and access failures distinguishable from technical failures
 * (lab section 2.2) — the same split lib/api.ts makes on the server.
 */
export type ApiErrorKind =
  | "validation"
  | "access"
  | "not-found"
  | "conflict"
  | "technical";

export interface ApiErrorView {
  kind: ApiErrorKind;
  title: string;
  message: string;
  requestId?: string;
}

const TITLES: Record<ApiErrorKind, string> = {
  validation: "Invalid input",
  access: "Access denied",
  "not-found": "Not found",
  conflict: "Slot already taken",
  technical: "Technical failure",
};

export function errorKind(status: number): ApiErrorKind {
  if (status === 400) return "validation";
  if (status === 401 || status === 403) return "access";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  return "technical";
}

export function toErrorView(status: number, body: unknown): ApiErrorView {
  const kind = errorKind(status);
  const payload =
    typeof body === "object" && body !== null
      ? (body as { error?: unknown; requestId?: unknown })
      : {};
  const serverMessage =
    typeof payload.error === "string" ? payload.error : undefined;

  return {
    kind,
    title: TITLES[kind],
    // Technical failures do not echo server internals; the request id is
    // what the runbook uses to trace them in the operation log.
    message:
      kind === "technical"
        ? `The service failed to process the request (HTTP ${status}). Try again later.`
        : (serverMessage ?? `Request failed (HTTP ${status}).`),
    requestId:
      typeof payload.requestId === "string" ? payload.requestId : undefined,
  };
}
