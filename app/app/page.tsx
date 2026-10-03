import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { formatDateTime } from "@/lib/format";
import { listManualsForUser } from "@/lib/supabase/server";
import { DeleteAllData } from "./DeleteAllData";
import { EmptyStateCard } from "./OnboardingEmptyState";
import {
  Badge,
  BodyText,
  ButtonLink,
  Card,
  CardBody,
  MutedText,
  SectionDivider,
  SectionTitle,
  Stack,
} from "@/components/ui";

/** Always fetch fresh list so deleted manuals never appear. */
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const manuals = await listManualsForUser(userId);

  return (
    <Stack>
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Badge tone="muted">YOUR MANUALS</Badge>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
            A simple home for &quot;How to work with me&quot;.
          </h1>
          <MutedText>Your versions, contexts, and exports in one place.</MutedText>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <ButtonLink href="/app/new" size="lg">
            Create a new manual
          </ButtonLink>
          <DeleteAllData />
        </div>
      </header>

      {manuals.length > 0 ? (
        <>
          <SectionDivider />
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle>Your manuals</SectionTitle>
              <MutedText>
                Each version is a snapshot of your answers at a moment in time.
              </MutedText>
            </div>
            <Card>
              <CardBody className="divide-y divide-token p-0">
                {manuals.map((m) => (
                  <Link
                    key={m.id}
                    href={`/app/manual/${m.id}`}
                    className="flex flex-col gap-1 px-5 py-4 sm:py-5 transition-colors hover:bg-surface sm:flex-row sm:items-center sm:justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500"
                  >
                    <div className="space-y-1">
                      <BodyText className="font-semibold text-ink">
                        Manual v{m.version}
                      </BodyText>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
                        <Badge tone={m.context === "general" ? "muted" : "default"}>
                          {m.context === "general" ? "General" : m.context}
                        </Badge>
                        <span>Created {formatDateTime(m.created_at)}</span>
                      </div>
                    </div>
                    <MutedText className="sm:text-right">
                      Open to view, export, share, or delete.
                    </MutedText>
                  </Link>
                ))}
              </CardBody>
            </Card>
          </section>
        </>
      ) : (
        <EmptyStateCard />
      )}
    </Stack>
  );
}
