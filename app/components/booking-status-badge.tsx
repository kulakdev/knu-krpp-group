import type { BookingDto } from "@/api-client/bookings";
import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<
  BookingDto["status"],
  "default" | "outline" | "secondary" | "destructive"
> = {
  ACTIVE: "default",
  PENDING: "outline",
  REJECTED: "destructive",
  CANCELLED: "secondary",
};

/** The booking's current status, shown explicitly (lab section 10.1). */
export function BookingStatusBadge({ status }: { status: BookingDto["status"] }) {
  return <Badge variant={VARIANTS[status]}>{status}</Badge>;
}
