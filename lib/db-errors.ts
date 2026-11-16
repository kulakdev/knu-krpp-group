import { Prisma } from "@prisma/client";

// Socket-level codes from pg and Prisma's own "can't reach the server" codes.
const CONNECTION_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "P1001",
  "P1002",
  "P1017",
]);

/**
 * True when an error means the database cannot be reached rather than a
 * defect in our code. With the pg driver adapter this shows up as:
 *  - a Prisma error with a socket code (ECONNREFUSED, ...);
 *  - a raw AggregateError with a socket code (interactive transactions);
 *  - a Prisma error wrapping a Postgres connection-exception (08xxx) or
 *    operator-intervention (57Pxx, e.g. "terminating connection due to
 *    administrator command") code — the first query after the DB stops.
 */
export function isDatabaseUnavailable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (typeof error !== "object" || error === null) return false;

  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && CONNECTION_CODES.has(code)) return true;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = error.meta as
      | { driverAdapterError?: { cause?: { originalCode?: unknown } } }
      | undefined;
    const pgCode = meta?.driverAdapterError?.cause?.originalCode;
    return (
      typeof pgCode === "string" &&
      (pgCode.startsWith("08") || pgCode.startsWith("57P"))
    );
  }
  return false;
}
