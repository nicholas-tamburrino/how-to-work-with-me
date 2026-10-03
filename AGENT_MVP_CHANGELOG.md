# Agent MVP – Changelog (merge reference)

This document lists all changes made during the agent MVP session so you can merge them into another branch or repo.

---

## 1. Authentication (Clerk)

### `middleware.ts`
- **Was:** `clerkMiddleware` + `createRouteMatcher` (v5 API – not in your installed Clerk v4).
- **Now:** Uses `authMiddleware` with `publicRoutes`. Then updated to **skip Clerk entirely for public paths** so `/`, `/sign-in`, `/sign-up`, `/s/*` never hit Clerk (avoids 401 interstitial). Protected routes still use `authMiddleware({ publicRoutes: [] })`.

### `app/layout.tsx`
- Pass `publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""}` into `<ClerkProvider>` so the client always has the key.

### `next.config.js`
- **CSP:** Allow `https://*.clerk.accounts.dev` and `https://challenges.cloudflare.com` (Clerk script + Turnstile bot protection) in `script-src`, `style-src`, `font-src`, `connect-src`, `frame-src`.

### `.env.local` (you created/edited)
- Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, sign-in/sign-up URLs.
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 2. Questionnaire → Generate flow

### `app/app/new/page.tsx`
- **Save:** Returns `{ responseId?, error? }`; checks `res.ok`; surfaces save errors in state and UI.
- **Load:** Uses `loadResponses()` with error handling; shows load error + Retry.
- **“Convert to manual”:** Replaced `<Link>` with `<button>`. On click: await `save(answers)`; only navigate if save succeeds and we have `responseId`; navigate to `/app/new/generate?responseId=${rid}`. Shows save error if save fails.
- **UI:** Load error (amber) and save error (red) banners; “Saved” when applicable.

### `app/app/new/generate/page.tsx`
- Read `responseId` from URL: `searchParams.get("responseId")`.
- Send `responseId` in POST body to `/api/generate` when present.
- When no `responseId` in URL: show note “Complete the questionnaire first” with link to `/app/new`.
- **Polling:** `pollJobStatus` returns `{ manualId?, error? }`. On `status === "failed"` show `data.error` (server-stored failure reason). On timeout show “Generation timed out. Please try again.”
- Copy/layout: “Convert into manual”, “Your answers are saved”, context card, clearer error + Try again.

### `app/api/generate/route.ts`
- Error messages: “No answers found. Complete the questionnaire from the first step, then use ‘Convert to manual’ on the last step.” and “This set of answers is empty. Complete the questionnaire and click ‘Convert to manual’ from the last step.”

### `lib/api-schemas.ts`
- `responsesPostBodySchema`: `responseId` changed from `.optional()` to `.nullish()` so the client can send `responseId: null` without “Invalid request body”.

---

## 3. Error handling and visibility

### `app/app/error.tsx` (app area)
- Use `router.refresh()` after `reset()` on “Try again”.
- Detect DB/schema errors (e.g. “relation”, “42p01”, “pgrst”) and show hint: run `supabase/schema.sql` in Supabase SQL Editor.
- Type-safe error message extraction.

### `app/api/responses/route.ts`
- GET/POST: in development, return Supabase `error.message` in JSON so the client can show the real failure (e.g. missing table).

### `lib/supabase/server.ts`
- Error message: “Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local (see .env.example).”

### `lib/queue/index.ts`
- **Generation job:** Wrap run in try/catch; on throw call `markJobFailed(jobId, e.message)` so the real error (e.g. `OPENAI_API_KEY not set`) is stored.
- Remove the outer `.catch()` that always set “Generation failed”.
- Inner helper `runGenerateJobInner`; `runGenerateJob` catches and marks failed with actual message.

---

## 4. Files touched (checklist for merge)

| Path | Change type |
|------|-------------|
| `middleware.ts` | Rewritten (public path skip + authMiddleware) |
| `app/layout.tsx` | ClerkProvider publishableKey |
| `next.config.js` | CSP: clerk.accounts.dev + challenges.cloudflare.com |
| `app/app/new/page.tsx` | Save/load errors, button “Convert to manual”, navigate with responseId |
| `app/app/new/generate/page.tsx` | responseId from URL, body; poll returns error; copy/UI |
| `app/app/error.tsx` | Try again + refresh; DB error hint |
| `app/api/generate/route.ts` | Clearer error messages |
| `app/api/responses/route.ts` | Dev error message in GET/POST |
| `lib/api-schemas.ts` | responseId nullish |
| `lib/supabase/server.ts` | Error message text |
| `lib/queue/index.ts` | Try/catch + real error in markJobFailed |
| `.env.local` | Created/updated (Clerk, Supabase – you filled values) |
| `.env.example` | Already had vars; no change needed |

---

## 5. How to merge into “agent MVP”

**Option A – Same repo, different branch**
1. Commit or stash current work in HTWWM.
2. Check out or create the agent MVP branch.
3. Merge your branch: `git merge <branch-with-these-changes>` (or cherry-pick commits).
4. Resolve conflicts using this changelog as reference.

**Option B – Copy into another folder (agent MVP repo)**
1. Copy the files listed in the table above from HTWWM into the agent MVP project (overwriting or merging by hand).
2. Ensure agent MVP has the same dependencies (`@clerk/nextjs`, `@supabase/supabase-js`, etc.) and env vars (Clerk, Supabase, optional OpenAI) in its `.env.local` / `.env.example`.
3. Run Supabase schema (and RLS) in the agent MVP’s Supabase project if it uses its own DB.

**Option C – Patch**
1. Create a patch from your current branch: `git diff main > agent-mvp.patch` (replace `main` with the base branch).
2. In the agent MVP repo: `git apply agent-mvp.patch` (or `patch -p1 < agent-mvp.patch`).

If you tell me the exact path to the “agent MVP” repo or branch (e.g. `C:\Users\ntamb\AgentMVP` or branch name), I can give step-by-step commands tailored to that.
