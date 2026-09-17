import type { User } from "@prisma/client";
import { NotImplementedError } from "@/lib/errors";

export const USER_ID_HEADER = "x-user-id";

/**
 * Mock authentication (ADR-002): the caller's identity arrives in the
 * x-user-id request header and is validated against the seeded users table.
 * This is a training-environment mechanism, not a security boundary.
 *
 * TODO(BOOK-12): read USER_ID_HEADER from req; missing header or unknown
 * user -> UnauthorizedError (401); known user -> the user record.
 */
export async function getCurrentUser(req: Request): Promise<User> {
  void req;
  throw new NotImplementedError("BOOK-12");
}
