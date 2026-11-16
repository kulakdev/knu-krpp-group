/**
 * Typed application errors. Route handlers must never leak raw Error objects
 * across the HTTP boundary — throw one of these and let lib/api.ts map it to
 * the correct status code. Validation (400), conflict (409), access (401/403)
 * and not-found (404) failures must stay distinguishable from technical
 * failures (500), per lab section 2.2.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Missing or invalid x-user-id header") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "The requested slot is already booked") {
    super(message, 409);
  }
}

export class InvalidTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(`Illegal booking state transition: ${from} -> ${to}`, 409);
  }
}

/**
 * A dependency (the database) cannot be reached. Technical failure, but
 * distinguishable from a defect in our code (500).
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = "Database unavailable") {
    super(message, 503);
  }
}

/**
 * Marker for stubbed code paths that are assigned as team tasks
 * (see docs/backlog.md). Agents must NOT implement these autonomously —
 * each TODO(BOOK-x) is a teammate's individual contribution.
 */
export class NotImplementedError extends AppError {
  constructor(taskKey: string) {
    super(`Not implemented — assigned task ${taskKey} (see docs/backlog.md)`, 501);
  }
}
