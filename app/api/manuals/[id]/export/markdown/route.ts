import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getManualById } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/authorization";

/**
 * GET: export manual as markdown file.
 * Returns the final markdown (edited_markdown ?? content_markdown) with proper headers.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: manualId } = await params;
  if (!manualId) {
    return NextResponse.json({ error: "Manual id required" }, { status: 400 });
  }

  const manual = await getManualById(manualId, userId);
  const ownerErr = requireOwner(userId, manual?.user_id);
  if (ownerErr) return ownerErr;

  if (!manual) {
    return NextResponse.json({ error: "Manual not found" }, { status: 404 });
  }

  // Use edited_markdown if it exists, otherwise fall back to generated content_markdown.
  const finalMarkdown = manual.edited_markdown ?? manual.content_markdown ?? "";

  if (!finalMarkdown.trim()) {
    return NextResponse.json({ error: "Manual has no content" }, { status: 400 });
  }

  const filename = `how-to-work-with-me-${manualId.slice(0, 8)}.md`;

  return new NextResponse(finalMarkdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
