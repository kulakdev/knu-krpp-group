import { describe, expect, it } from "vitest";
import { BookingStatus } from "@prisma/client";
import {
  assertTransition,
  BLOCKING_STATUSES,
  canTransition,
} from "@/lib/booking-state";
import { InvalidTransitionError } from "@/lib/errors";

/**
 * BOOK-14 — unit tests for the v1.0 booking state machine (lab section 7.2).
 */
describe("canTransition", () => {
  it("allows ACTIVE -> CANCELLED", () => {
    expect(canTransition(BookingStatus.ACTIVE, BookingStatus.CANCELLED)).toBe(
      true,
    );
  });

  it("forbids any transition out of CANCELLED", () => {
    expect(canTransition(BookingStatus.CANCELLED, BookingStatus.ACTIVE)).toBe(
      false,
    );
    expect(
      canTransition(BookingStatus.CANCELLED, BookingStatus.CANCELLED),
    ).toBe(false);
  });

  it("forbids the ACTIVE self-loop", () => {
    expect(canTransition(BookingStatus.ACTIVE, BookingStatus.ACTIVE)).toBe(
      false,
    );
  });
});

describe("assertTransition", () => {
  it("passes for an allowed transition", () => {
    expect(() =>
      assertTransition(BookingStatus.ACTIVE, BookingStatus.CANCELLED),
    ).not.toThrow();
  });

  it("throws InvalidTransitionError (409) for a forbidden transition", () => {
    let caught: unknown;
    try {
      assertTransition(BookingStatus.CANCELLED, BookingStatus.ACTIVE);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(InvalidTransitionError);
    expect((caught as InvalidTransitionError).statusCode).toBe(409);
  });
});

describe("BLOCKING_STATUSES", () => {
  it("contains only ACTIVE in v1.0", () => {
    expect(BLOCKING_STATUSES).toEqual([BookingStatus.ACTIVE]);
  });
});
