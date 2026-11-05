"use client";

import { useIsMutating } from "@tanstack/react-query";
import {
  type BookingDto,
  useCancelBooking,
  useMyBookings,
} from "@/api-client/bookings";
import { errorView } from "@/api-client/http";
import { BookingStatusBadge } from "@/app/components/booking-status-badge";
import { ErrorBox } from "@/app/components/error-box";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKyiv, formatKyivTime } from "@/lib/kyiv-time";
import { useDashboardStore } from "@/store/dashboard-store";
import { MOCK_USERS, useCurrentUser } from "@/store/user-store";

// PENDING requests can be withdrawn by their owner (v2.0).
const CANCELLABLE: BookingDto["status"][] = ["ACTIVE", "PENDING"];

/** "Approved by Admin User, 07.01.2030 12:30" — author and time of the decision. */
function decisionText(booking: BookingDto): string | null {
  if (!booking.decision || !booking.decidedAt) return null;
  const admin =
    MOCK_USERS.find((user) => user.id === booking.decidedById)?.name ??
    booking.decidedById;
  const verb = booking.decision === "APPROVED" ? "Approved" : "Rejected";
  return `${verb} by ${admin}, ${formatKyiv(booking.decidedAt)}`;
}

/** The current mock user's bookings with status, admin decision and Cancel. */
export function MyBookingsCard() {
  const user = useCurrentUser();
  const setNotice = useDashboardStore((state) => state.setNotice);
  const bookings = useMyBookings(user.id);
  const cancelBooking = useCancelBooking(user.id);
  const actionInFlight = useIsMutating() > 0;

  function cancel(booking: BookingDto) {
    cancelBooking.mutate(booking.id, {
      onSuccess: () =>
        setNotice({ kind: "success", text: `Cancelled ${booking.roomName}.` }),
      onError: (error) => setNotice({ kind: "error", error: errorView(error) }),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My bookings</CardTitle>
        <CardDescription>
          {user.name} ({user.role})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.isError ? (
          <ErrorBox error={errorView(bookings.error)} />
        ) : bookings.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : bookings.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.data.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    {booking.roomName}
                  </TableCell>
                  <TableCell>
                    {formatKyiv(booking.startTime)}–
                    {formatKyivTime(booking.endTime)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <BookingStatusBadge status={booking.status} />
                      {decisionText(booking) && (
                        <p className="text-xs text-muted-foreground">
                          {decisionText(booking)}
                        </p>
                      )}
                      {booking.status === "PENDING" && (
                        <p className="text-xs text-muted-foreground">
                          Waiting for admin approval
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {CANCELLABLE.includes(booking.status) && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={actionInFlight}
                        onClick={() => cancel(booking)}
                      >
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
