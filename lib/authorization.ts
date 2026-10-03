import { NextResponse } from "next/server";

/**
 * Authorization helper: ensures the current user owns the resource.
 * Use on every endpoint that fetches a response, manual, or share link.
 *
 * Why 404 (not 403):
 * Returning 403 would reveal that a resource exists but belongs to someone else.
 * We return 404 for both "resource does not exist" and "resource exists but you don't own it"
 * so we don't leak information about other users' data.
 *
 * @param currentUserId - From auth() (Clerk). Must be the logged-in user's id.
 * @param resourceUserId - The user_id on the resource (response, manual, or manual owner for share link).
 * @returns NextResponse with 404 if unauthorized or resource missing; null if authorized.
 */
export function requireOwner(
  currentUserId: string | null,
  resourceUserId: string | undefined | null
): NextResponse | null {
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (resourceUserId == null || resourceUserId !== currentUserId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}
