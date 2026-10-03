import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { isAdmin } from "@/lib/admin";
import { AppClientWrapper } from "./AppClientWrapper";
import { Badge } from "@/components/ui";
import { ThemeToggle } from "./ThemeToggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const showAdmin = isAdmin(userId);

  return (
    <AppClientWrapper>
      <div className="min-h-screen bg-app">
        <header className="border-b border-token bg-surface-2">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="font-display text-sm font-semibold tracking-tight text-ink hover:text-accent-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ring-offset-surface rounded"
              >
                How To Work With Me
              </Link>
              <Badge tone="default" className="hidden sm:inline-flex">
                App
              </Badge>
            </div>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/app"
                className="text-mute hover:text-ink hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ring-offset-surface rounded"
              >
                Dashboard
              </Link>
              <Link
                href="/app/new"
                className="font-medium text-ink hover:text-accent-600 hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ring-offset-surface rounded"
              >
                New manual
              </Link>
              <Link
                href="/app/demo"
                className="text-mute hover:text-ink hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ring-offset-surface rounded"
              >
                Demo
              </Link>
              {showAdmin && (
                <Link
                  href="/app/admin"
                  className="text-mute hover:text-ink hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ring-offset-surface rounded"
                >
                  Admin
                </Link>
              )}
              <ThemeToggle />
              <div className="[&_.cl-userButtonTrigger]:h-9 [&_.cl-userButtonTrigger]:w-9 [&_.cl-userButtonTrigger]:rounded-lg [&_.cl-userButtonTrigger]:border [&_.cl-userButtonTrigger]:border-token [&_.cl-userButtonTrigger]:bg-surface-2 [&_.cl-userButtonTrigger]:text-mute [&_.cl-userButtonTrigger:hover]:text-ink [&_.cl-userButtonTrigger:hover]:border-accent-200 [&_.cl-userButtonPopoverCard]:bg-surface-2 [&_.cl-userButtonPopoverCard]:border-token">
                <UserButton afterSignOutUrl="/" />
              </div>
            </nav>
          </div>
        </header>
        <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>
      </div>
    </AppClientWrapper>
  );
}
