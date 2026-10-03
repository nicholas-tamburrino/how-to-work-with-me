import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getManualById, listShareLinksForManual } from "@/lib/supabase/server";
import { Badge, Card, CardBody, MutedText } from "@/components/ui";
import { ManualWorkspace } from "./ManualWorkspace";

export default async function ManualPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return null;

  const manual = await getManualById(id, userId);
  if (!manual) notFound();

  const shareLinks = await listShareLinksForManual(id, userId);
  const isDemoManual =
    typeof manual.content_markdown === "string" &&
    manual.content_markdown.includes("<!-- DEMO_MANUAL -->");

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Link href="/app" className="text-sm text-mute hover:text-ink hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 rounded ring-offset-surface">
          ← Dashboard
        </Link>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Your manual
            </h1>
            <Badge tone="muted">VERSION {manual.version}</Badge>
            {manual.context && (
              <Badge tone={manual.context === "general" ? "muted" : "default"}>
                {manual.context === "general" ? "General" : manual.context}
              </Badge>
            )}
            {isDemoManual && <Badge tone="muted">Demo</Badge>}
          </div>
          <MutedText>
            A document-style view of how to work with you best — ready to share or
            export.
          </MutedText>
        </div>
      </header>

      <Card>
        <CardBody className="space-y-4">
          <ManualWorkspace
            manualId={id}
            context={manual.context}
            version={manual.version}
            createdAt={manual.created_at}
            shareLinks={shareLinks}
            isDemo={isDemoManual}
            generatedMarkdown={manual.content_markdown}
            editedMarkdown={manual.edited_markdown ?? null}
            editedAt={manual.edited_at ?? null}
          />
        </CardBody>
      </Card>
    </div>
  );
}
