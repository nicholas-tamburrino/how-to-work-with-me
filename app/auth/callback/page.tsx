import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const ALLOWED_NEXT_PREFIX = "/app";

/** Validates `next` is a relative path starting with /app (no open redirect). */
function safeNextPath(next: string | undefined): string {
  if (!next || typeof next !== "string") return ALLOWED_NEXT_PREFIX;
  const trimmed = next.trim();
  if (trimmed.startsWith(ALLOWED_NEXT_PREFIX) && !trimmed.includes("//")) return trimmed;
  return ALLOWED_NEXT_PREFIX;
}

/**
 * Auth callback (failsafe): single redirect target after sign-in/sign-up.
 * - If NOT signed in: redirect to /sign-in?redirect_url=/auth/callback
 * - If signed in: read `next` from search params (NOT redirect_url); validate relative /app path; redirect(next) or /app
 */
export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }> | { next?: string | string[] };
}) {
  const params =
    searchParams && typeof (searchParams as Promise<unknown>).then === "function"
      ? await (searchParams as Promise<{ next?: string | string[] }>)
      : (searchParams as { next?: string | string[] });
  const raw = params?.next;
  const nextParam = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;

  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/auth/callback");
  }

  if (process.env.AUTH_DEBUG === "true") {
    console.log("[auth]", { pathname: "/auth/callback", hasRedirectUrl: false, hasNext: !!nextParam, isSignedIn: true });
  }

  const nextPath = safeNextPath(nextParam);
  redirect(nextPath);
}
