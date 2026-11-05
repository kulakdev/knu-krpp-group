"use client";

import { useIsMutating } from "@tanstack/react-query";
import {
  type DecisionAction,
  type PendingBookingDto,
  useDecideBooking,
  usePendingBookings,
} from "@/api-client/admin";
import { errorView } from "@/api-client/http";
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
import { useCurrentUser } from "@/store/user-store";

/**
 * PENDING requests for large rooms with Approve / Reject (v2.0). The queue
 * is loaded for any mock user on purpose: a student gets the server's 403,
 * which shows that rights are enforced by the API, not by this page.
 */
export function PendingRequestsCard() {
  const user = useCurrentUser();
  const setNotice = useDashboardStore((state) => state.setNotice);
  const pending = usePendingBookings(user.id);
  const decide = useDecideBooking(user.id);
  const actionInFlight = useIsMutating() > 0;

  function run(booking: PendingBookingDto, action: DecisionAction) {
    decide.mutate(
      { bookingId: booking.id, action },
      {
        onSuccess: () =>
          setNotice({
            kind: "success",
            text: `${action === "approve" ? "Approved" : "Rejected"} ${booking.roomName} for ${booking.userName}.`,
          }),
        onError: (error) => setNotice({ kind: "error", error: errorView(error) }),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending requests</CardTitle>
        <CardDescription>
          Bookings of rooms with more than 100 seats wait for an administrator.
          {user.role !== "Admin" && " Switch to Admin User to review them."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pending.isError ? (
          <ErrorBox error={errorView(pending.error)} />
        ) : pending.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : pending.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Requested by</TableHead>
                <TableHead>When</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.data.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.roomName}</TableCell>
                  <TableCell>{booking.userName}</TableCell>
                  <TableCell>
                    {formatKyiv(booking.startTime)}–{formatKyivTime(booking.endTime)}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button
                      size="sm"
                      disabled={actionInFlight}
                      onClick={() => run(booking, "approve")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actionInFlight}
                      onClick={() => run(booking, "reject")}
                    >
                      Reject
                    </Button>
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
