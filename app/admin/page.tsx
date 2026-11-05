import { PendingRequestsCard } from "@/app/admin/components/pending-requests-card";
import { AppHeader } from "@/app/components/app-header";
import { Notice } from "@/app/components/notice";

/** Admin panel (v2.0, BOOK-34): review PENDING requests for large rooms. */
export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <AppHeader current="/admin" />
      <Notice />
      <PendingRequestsCard />
    </main>
  );
}
