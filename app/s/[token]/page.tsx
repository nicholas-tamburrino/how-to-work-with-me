import { createHash } from "crypto";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getManualByShareToken } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { Badge, Document, DocumentFooter, DocumentHeader, MutedText } from "@/components/ui";

export const metadata = {
  robots: "noindex, nofollow",
};

export default async function SharedManualPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "anonymous";
  const limit = await checkRateLimit("share-view", ip);
  if (!limit.success) {
    return (
      <main className="min-h-screen bg-app flex items-center justify-center px-4">
        <p className="text-mute text-center">{limit.message}</p>
      </main>
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const result = await getManualByShareToken(tokenHash);
  if (!result) notFound();

  return (
    <main className="min-h-screen bg-app py-10 px-4">
      <div className="content-container mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl">
          <Document>
          <DocumentHeader title="How to Work With Me">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="muted">View only</Badge>
            </div>
            <MutedText className="text-sm">
              Shared by the owner. No login required; content is read-only.
            </MutedText>
          </DocumentHeader>
          <div className="min-w-0 flex-1">
            <SafeMarkdown content={result.contentMarkdown} />
          </div>
          <DocumentFooter />
        </Document>
        </div>
      </div>
    </main>
  );
}
