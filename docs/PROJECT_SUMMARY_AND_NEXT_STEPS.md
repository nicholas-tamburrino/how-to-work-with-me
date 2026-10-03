# Project Summary & Next Steps

This document summarizes the **How To Work With Me** app, what has been built, the **ongoing Clerk sign-in issue**, and context for deciding where to go next (e.g. with GPT or another agent).

---

## 1. Project overview

**App name:** How To Work With Me  

**Purpose:** Users answer a short questionnaire; the app generates a personal “How To Work With Me” communication manual (plain language, from their answers only—no personality tests or labels).

**Tech stack:**
- **Next.js 14** (App Router), TypeScript, Tailwind
- **Clerk** – authentication (sign-in/sign-up required for app)
- **Supabase** – Postgres, Storage (e.g. PDF exports), RLS
- **OpenAI** – server-side manual generation (API key never exposed)
- Optional: Upstash Redis for rate limiting; Stripe scaffolded but not required for MVP

**Relevant docs in repo:** `README.md`, `DEPLOY.md`, `docs/QA.md`, `AGENT_MVP_CHANGELOG.md`, `.env.example`.

---

## 2. What’s been built (current state)

### Authentication & routing
- **Middleware** (`middleware.ts`): Public paths `/`, `/sign-in`, `/sign-up`, `/s/*` skip Clerk entirely (no 401 interstitial). All other routes use `authMiddleware({ publicRoutes: [] })`.
- **Root layout** (`app/layout.tsx`): `ClerkProvider` with `publishableKey`, `signInForceRedirectUrl`, `signUpForceRedirectUrl`, `afterSignInUrl`, `afterSignUpUrl` (all set to `/app`).
- **Sign-in / sign-up pages:** Custom pages using Clerk’s `<SignIn>` and `<SignUp>` with explicit `afterSignInUrl`, `redirectUrl`, and `forceRedirectUrl` (sign-in only) set to `/app`. CSP in `next.config.js` allows Clerk and Cloudflare Turnstile.

### App flow (post sign-in)
- **Dashboard** (`/app`): Lists user’s manuals; “Start new manual”, “Delete all data”.
- **Questionnaire** (`/app/new`): Multi-step form; answers autosaved via `/api/responses`; “Convert to manual” saves and navigates to `/app/new/generate?responseId=...`.
- **Generate** (`/app/new/generate`): Context picker (general/work/partner); POST to `/api/generate` returns `jobId`; client polls `/api/generate/status` until completed/failed; then redirects to `/app/manual/[id]`.
- **Manual view** (`/app/manual/[id]`): View manual, regenerate, export PDF, create/revoke share link, delete manual.
- **Share (public)** (`/s/[token]`): Public view of shared manual by token (server-side lookup; no anon read on share_links).
- **Demo** (`/app/demo`): Creates sample answers and generates a demo manual for the current user.
- **Admin** (`/app/admin`): Allowlist-protected (via `ADMIN_USER_IDS`); audit logs, failed jobs, revoke share link, “Seed 3 demo manuals”.

### API & backend
- **APIs:** `/api/responses` (GET/POST), `/api/generate` (POST, 202 + jobId), `/api/generate/status`, `/api/manuals/[id]`, `/api/share`, `/api/export-pdf`, `/api/events`, `/api/health`, `/api/me/delete-data`, `/api/admin/revoke-share-link`, `/api/admin/seed-demos`.
- **Generation:** Queue creates a job row, runs `generateManualMarkdown` (OpenAI) in background, stores manual, marks job completed/failed. If `OPENAI_API_KEY` is missing, generate API returns 503 with a clear message before enqueueing.
- **Supabase:** `schema.sql` (tables, RLS enabled); `rls.sql` (policies for responses, manuals, share_links, audit_logs, jobs, events). App uses `SUPABASE_SERVICE_ROLE_KEY` server-side; ownership enforced in code and RLS.
- **Events:** Privacy-safe `events` table; `trackEvent()` with allowed event names (e.g. response_saved, manual_generation_*, pdf_exported, share_created/revoked).

### Other
- **DEPLOY.md:** Vercel setup, env list, health check, smoke test.
- **docs/QA.md:** QA checklist (auth, access control, rate limits, share links, PDF, delete, admin, smoke).
- **Node.js:** Installed (e.g. via winget); `package.json` has Next 14.2.25 to satisfy Clerk peer deps. Dev server runs on port 3000 (or 3001 if 3000 is in use).

---

## 3. The Clerk sign-in issue (detailed)

### Symptom
After the user completes the sign-in flow (including Clerk’s **factor-one** and **factor-two** steps, e.g. identifier then password or 2FA), the app **never navigates away** from the sign-in UI. The browser stays on a page under `/sign-in` (e.g. `/sign-in/factor-two` or `/sign-in/factor-one`) with `redirect_url=http://localhost:3001/app/new` (or similar) in the query string. Server logs show `GET /sign-in/factor-two?redirect_url=...` and `GET /sign-in/factor-one?redirect_url=...` returning 200, but no subsequent request to `/app` or `/app/new`. So the **post–sign-in redirect to the app never happens**.

### What’s in place to fix it
1. **Force redirect (app and env)**  
   - Root layout: `ClerkProvider` has `signInForceRedirectUrl="/app"`, `signUpForceRedirectUrl="/app"`, `afterSignInUrl="/app"`, `afterSignUpUrl="/app"`.  
   - Sign-in page: `<SignIn>` has `afterSignInUrl`, `redirectUrl`, and `forceRedirectUrl` set to `/app`.  
   - Sign-up page: `<SignUp>` has `afterSignUpUrl`, `redirectUrl`, and `forceRedirectUrl` set to `/app`.

2. **Env vars (in `.env.local`)**  
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/app`  
   - `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/app`, `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/app`  
   - `CLERK_SIGN_IN_FORCE_REDIRECT_URL=/app`, `CLERK_SIGN_UP_FORCE_REDIRECT_URL=/app` (server-side, in case Clerk backend uses them)

3. **Public routes**  
   - Middleware does **not** run Clerk on `/sign-in` or `/sign-up` (or their subpaths like `/sign-in/factor-one`), so the sign-in UI loads without 401. Protected routes (e.g. `/app`) still use `authMiddleware`.

4. **Landing page**  
   - CTA links to `/sign-in?redirect_url=/app` (relative path).

### What’s still unknown / not done
- **Clerk Dashboard allowlist:** Many Clerk setups require **allowed redirect URLs** (or similar) to be configured in the Dashboard (e.g. Configure → Paths or Settings → URLs). If the redirect URL (e.g. `http://localhost:3000/app` or `http://localhost:3001/app`) is **not** allowlisted, Clerk may complete sign-in but **refuse to redirect** to that URL for security, which would match the observed “stuck on factor-one/factor-two” behavior. The user may not have added `http://localhost:3000`, `http://localhost:3001`, and/or `http://localhost:3001/app` to that allowlist yet.
- **Clerk SDK version:** The app uses **Clerk v4** (`@clerk/nextjs` 4.x). The merge helper in that version only explicitly handles `afterSignInUrl` / `afterSignUpUrl` from env; it’s unclear whether `signInForceRedirectUrl` / `signUpForceRedirectUrl` are fully respected in all sub-routes (e.g. factor-one/factor-two) or only in the main sign-in component. So the force-redirect might not be applied consistently on every step.
- **Redirect URL in the request:** When an unauthenticated user hits `/app/new`, Clerk’s middleware redirects to sign-in with `returnBackUrl` set to the **full URL** (e.g. `http://localhost:3001/app/new`). That becomes the `redirect_url` query param. Even with force-redirect set, some Clerk flows might still validate that the *requested* redirect URL is allowlisted before performing any redirect; if validation fails, they might not redirect at all.

### Summary for GPT / next steps
- **Working:** App runs; middleware; questionnaire → generate → manual flow; APIs; Supabase; OpenAI; admin; events; deploy/QA docs.  
- **Blocking issue:** Sign-in completes (factor-one/factor-two) but **Clerk never redirects to `/app`**; user stays on the sign-in page.  
- **Already tried:** Force redirect and after-sign-in URL on `ClerkProvider` and on `<SignIn>` / `<SignUp>`; all related env vars (client and server); public routes for sign-in.  
- **Likely next steps:**  
  1. **Confirm Clerk Dashboard:** In the Clerk application’s Configure/Settings → Paths (or URLs), add **Allowed redirect URLs** (or equivalent) to include the dev origin and path, e.g. `http://localhost:3000`, `http://localhost:3001`, `http://localhost:3000/app`, `http://localhost:3001/app`.  
  2. **If still stuck:** Consider Clerk support or docs for “redirect URL allowlist” and “force redirect” in v4; or try a minimal test (e.g. redirect to `/` or a single allowlisted path) to see if any redirect works.  
  3. **Alternative:** Implement a custom post–sign-in callback route (e.g. `/auth/callback`) that Clerk redirects to, then the app redirects to `/app` server-side, to avoid relying solely on Clerk’s client-side redirect behavior.

---

## 4. Environment and setup (quick reference)

- **Node/npm:** Installed; `npm install` and `npm run dev` work (use refreshed PATH in new terminals if needed).
- **Env file:** `.env.local` exists with Clerk keys, Supabase URL/keys, and the redirect/force-redirect vars above. `.env.example` documents all vars including `OPENAI_API_KEY`, `ADMIN_USER_IDS`, optional Upstash, etc.
- **DB:** Run `supabase/schema.sql` then `supabase/rls.sql` in the Supabase project; create `pdf-exports` bucket if using PDF export.
- **Dev server:** Typically `http://localhost:3000` (or 3001 if 3000 is in use).

---

## 5. Suggested prompt for “where to move forward next”

You can hand this to GPT (or another agent) as context:

- **“I have a Next.js 14 app with Clerk auth. Sign-in completes (user goes through factor-one and factor-two), but Clerk never redirects to `/app`; the user stays on the sign-in page. We’ve already set `signInForceRedirectUrl`, `afterSignInUrl`, and related env vars on ClerkProvider and the SignIn component. What should we do next? Consider: (1) Clerk Dashboard redirect URL allowlist, (2) Clerk v4 behavior for force redirect on factor-one/factor-two sub-routes, (3) a custom auth callback route that redirects to `/app` server-side after sign-in.”**

Attach or reference this document and, if useful, the repo’s `README.md`, `app/layout.tsx`, and `app/sign-in/[[...sign-in]]/page.tsx` so the model can see the exact configuration.
