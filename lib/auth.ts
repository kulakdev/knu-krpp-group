import type { User } from "@prisma/client";
import { UnauthorizedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const USER_ID_HEADER = "x-user-id";

/**
 * Mock authentication (ADR-002): the caller's identity arrives in the
 * x-user-id request header and is validated against the seeded users table.
 * This is a training-environment mechanism, not a security boundary.
 *
 * Missing header or unknown user -> UnauthorizedError (401); known user ->
 * the user record (including its role).
 */
export async function getCurrentUser(req: Request): Promise<User> {
  const userId = req.headers.get(USER_ID_HEADER)?.trim();
  if (!userId) {
    throw new UnauthorizedError(`Missing ${USER_ID_HEADER} header`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    // The raw header value is not echoed back to keep the response free of
    // caller-controlled text.
    throw new UnauthorizedError(`Unknown user in ${USER_ID_HEADER} header`);
  }

  return user;
}
