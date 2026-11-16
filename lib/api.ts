import { NextResponse } from "next/server";
import { Equipment } from "@prisma/client";
import { isDatabaseUnavailable } from "@/lib/db-errors";
import {
  AppError,
  ServiceUnavailableError,
  ValidationError,
} from "@/lib/errors";
import { logOperation, type OperationLogEntry } from "@/lib/logger";

type RouteContext = { params: Promise<Record<string, string>> };
type Handler<C extends RouteContext = RouteContext> = (
  req: Request,
  ctx?: C,
) => Promise<Response>;

/**
 * Wraps every API route handler with:
 *  - a correlation id (x-request-id response header, lab section 8.2);
 *  - structured operation logging with duration;
 *  - typed-error mapping so validation/conflict/access failures stay
 *    distinguishable from technical failures (lab section 2.2), and an
 *    unreachable database (503) from a defect in our code (500).
 *
 * Route handlers contain no business logic — they parse input, delegate to
 * lib/ services, and shape the response.
 */
export function apiHandler<C extends RouteContext = RouteContext>(
  op: string,
  handler: (
    req: Request,
    ctx: C & { requestId: string },
  ) => Promise<Response>,
): Handler<C> {
  return async (req, ctx) => {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    let statusCode = 200;

    // Next always passes a context for dynamic routes; static routes and
    // direct test invocations may omit it — default to empty params.
    const fullCtx = {
      ...(ctx ?? { params: Promise.resolve({}) }),
      requestId,
    } as C & { requestId: string };

    try {
      const res = await handler(req, fullCtx);
      statusCode = res.status;
      res.headers.set("x-request-id", requestId);
      // A route may return a 5xx itself (health: 503 when the database is
      // down) — still a failure for the metrics (BOOK-46).
      const result = statusCode >= 500 ? "error" : "ok";
      log(req, op, requestId, result, statusCode, startedAt);
      return res;
    } catch (error) {
      const appError = toAppError(error);
      statusCode = appError.statusCode;
      const cause = error === appError ? undefined : error;
      if (cause !== undefined) {
        // Stack trace of a technical failure, tied to its operation log line.
        console.error(`requestId=${requestId}`, cause);
      }
      log(req, op, requestId, "error", statusCode, startedAt, appError, cause);
      return NextResponse.json(
        { error: appError.message, requestId },
        { status: statusCode, headers: { "x-request-id": requestId } },
      );
    }
  };
}

/**
 * Typed errors pass through; an unreachable database is 503; anything else
 * is a technical failure (500).
 */
function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isDatabaseUnavailable(error)) return new ServiceUnavailableError();
  return new AppError("Internal server error", 500);
}

/** Name and code of the original error behind a technical failure. */
function describeCause(
  cause: unknown,
): Pick<OperationLogEntry, "errorName" | "errorCode"> {
  if (typeof cause !== "object" || cause === null) {
    return { errorName: typeof cause };
  }
  const { name, code } = cause as { name?: unknown; code?: unknown };
  return {
    errorName: typeof name === "string" ? name : undefined,
    errorCode: typeof code === "string" ? code : undefined,
  };
}

function log(
  req: Request,
  op: string,
  requestId: string,
  result: "ok" | "error",
  statusCode: number,
  startedAt: number,
  error?: AppError,
  cause?: unknown,
): void {
  logOperation({
    ts: new Date().toISOString(),
    // Business outcomes (4xx: validation, ownership, conflict) are expected
    // results, not faults — `result` records failure, `level` stays reserved
    // for technical problems so incident-drill triage by level stays clean.
    level: statusCode >= 500 ? "error" : "info",
    requestId,
    op,
    userId: req.headers.get("x-user-id") ?? undefined,
    result,
    statusCode,
    durationMs: Date.now() - startedAt,
    error: error?.message,
    ...(cause === undefined ? {} : describeCause(cause)),
  });
}

const EQUIPMENT_BY_NAME: Record<string, Equipment> = {
  projector: Equipment.PROJECTOR,
  computers: Equipment.COMPUTERS,
  whiteboard: Equipment.WHITEBOARD,
};

/**
 * Parses `equipment=projector,computers` into Equipment values; null means
 * no filter. An empty or unknown value throws ValidationError (400).
 */
export function parseEquipment(value: string | null): Equipment[] | null {
  if (value === null) return null;

  const names = value.split(",").map((name) => name.trim().toLowerCase());
  if (names.some((name) => name.length === 0)) {
    throw new ValidationError("equipment must not contain empty values");
  }
  const unknown = names.filter((name) => !(name in EQUIPMENT_BY_NAME));
  if (unknown.length > 0) {
    throw new ValidationError(
      `Unknown equipment: ${unknown.join(", ")} (allowed: ${Object.keys(EQUIPMENT_BY_NAME).join(", ")})`,
    );
  }
  return [...new Set(names.map((name) => EQUIPMENT_BY_NAME[name]))];
}

/** Parses an ISO-8601 string into a Date or throws ValidationError (400). */
export function parseIsoDateTime(value: unknown, field: string): Date {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError(`${field} is required (ISO 8601 string)`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} is not a valid ISO 8601 datetime`);
  }
  return date;
}
