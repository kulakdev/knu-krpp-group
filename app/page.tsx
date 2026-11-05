import { AppHeader } from "@/app/components/app-header";
import { EquipmentFilter } from "@/app/components/equipment-filter";
import { IntervalPicker } from "@/app/components/interval-picker";
import { MyBookingsCard } from "@/app/components/my-bookings-card";
import { Notice } from "@/app/components/notice";
import { RoomsTable } from "@/app/components/rooms-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Dashboard (BOOK-13): composes the client blocks; data lives in
 * api-client/, shared UI state in store/.
 */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <AppHeader current="/" />

      <Notice />

      <Card>
        <CardHeader>
          <CardTitle>Rooms</CardTitle>
          <CardDescription>
            Pick an interval and equipment to see which rooms are free.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <IntervalPicker />
          <EquipmentFilter />
          <RoomsTable />
        </CardContent>
      </Card>

      <MyBookingsCard />
    </main>
  );
}
