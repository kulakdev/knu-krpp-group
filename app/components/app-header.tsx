import Link from "next/link";
import { UserSwitcher } from "@/app/components/user-switcher";
import { buttonVariants } from "@/components/ui/button";

const PAGES = [
  { href: "/", label: "Dashboard" },
  { href: "/admin", label: "Admin panel" },
] as const;

/** Title, page navigation and the mock-user switcher shared by all pages. */
export function AppHeader({ current }: { current: (typeof PAGES)[number]["href"] }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <div>
          <h1 className="text-2xl font-semibold">University Room Booking</h1>
          <p className="text-sm text-muted-foreground">
            Times are shown in Europe/Kyiv.
          </p>
        </div>
        <nav className="flex gap-1" aria-label="Pages">
          {PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              aria-current={page.href === current ? "page" : undefined}
              className={buttonVariants({
                variant: page.href === current ? "secondary" : "ghost",
                size: "sm",
              })}
            >
              {page.label}
            </Link>
          ))}
        </nav>
      </div>
      <UserSwitcher />
    </header>
  );
}
