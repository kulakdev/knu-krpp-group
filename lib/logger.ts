/**
 * Minimal structured operation log (lab section 8.2). Every API operation is
 * logged as one JSON line with a correlation id so a failed operation can be
 * traced across components during the incident drill. No external monitoring
 * platform required — `npm run dev | grep <requestId>` is the trace tool.
 */
export type OperationResult = "ok" | "error";

export interface OperationLogEntry {
  ts: string;
  level: "info" | "error";
  requestId: string;
  op: string;
  userId?: string;
  result: OperationResult;
  statusCode: number;
  durationMs: number;
  error?: string;
  // Technical failures only: the original error behind the generic message.
  errorName?: string;
  errorCode?: string;
}

export function logOperation(entry: OperationLogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}
