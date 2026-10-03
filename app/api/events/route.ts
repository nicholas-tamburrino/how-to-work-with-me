import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { trackEvent } from "@/lib/events";

const ALLOWED_CLIENT_EVENTS = ["demo_used"] as const;

/**
 * POST: track a privacy-safe event from the client. Body: { eventName: string }
 * Only allows event names that are safe to trigger from client (e.g. demo_used).
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[route hit] /api/events POST");
  }
  const { userId } = await auth();
  let body: { eventName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const eventName = body.eventName;
  if (
    !eventName ||
    !ALLOWED_CLIENT_EVENTS.includes(eventName as (typeof ALLOWED_CLIENT_EVENTS)[number])
  ) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }
  await trackEvent(userId ?? null, eventName as "demo_used", {});
  return NextResponse.json({ ok: true });
}
