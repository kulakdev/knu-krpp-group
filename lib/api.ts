import { NextResponse } from "next/server";
import { Equipment } from "@prisma/client";
import { isDatabaseUnavailable } from "@/lib/db-errors";
import {
  AppError,
  ServiceUnavailableError,
  ValidationError,
} from "@/lib/errors";
import { logOperation } from "@/lib/logger";

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
      log(req, op, requestId, "ok", statusCode, startedAt);
      return res;
    } catch (error) {
      const appError =
        error instanceof AppError
          ? error
          : isDatabaseUnavailable(error)
            ? new ServiceUnavailableError()
            : new AppError("Internal server error", 500);
      statusCode = appError.statusCode;
      if (!(error instanceof AppError)) {
        console.error(error);
      }
      log(req, op, requestId, "error", statusCode, startedAt, appError);
      return NextResponse.json(
        { error: appError.message, requestId },
        { status: statusCode, headers: { "x-request-id": requestId } },
      );
    }
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
