# Polish + Hardening — Phase Checklist

This document tracks what was changed in each phase and how to verify. Do not change core product behavior or remove security guarantees (404-on-unauthorized, no PII logging, no raw token logging).

---

## Step 0 — BASELINE (DO FIRST)

**Goal:** Establish smoke test and check/build scripts; confirm MVP passes before making changes.

### Changes made

- **package.json**
  - Added `typecheck`: `tsc --noEmit`
  - Added `check`: `npm run lint && npm run typecheck`
  - Updated `build:check`: `npm run check && node scripts/check-env.js && next build`
- **.eslintrc.json**
  - Added so `npm run lint` runs non-interactively (extends `next/core-web-vitals`, `next/typescript`).
- **docs/SMOKE_TEST.md**
  - 10-minute smoke test checklist: check/build, auth, questionnaire → generate, manual actions, share view, delete.
- **docs/POLISH_PHASES.md**
  - This file; phase checklist and verification steps.
- **Lint/typecheck fixes (no behavior change):**
  - `app/api/export-pdf/route.ts`: Response body uses `new Uint8Array(buffer)` for `NextResponse` type; removed unused `MIN_Y`.
  - `app/api/generate/route.ts`: Removed unused `ManualContext` import.
  - `app/app/new/page.tsx`: `catch (e)` → `catch`.
  - `lib/env.ts`: `optional` exported as `optionalEnvKeys` (used).
  - `lib/feature-flags.ts`: `requireStripeSubscription` uses `void userId` to satisfy no-unused-vars.

### How to verify

1. Run: `npm run check` → exits 0.
2. Run: `npm run build` (or `npm run build:check` with env set) → build succeeds.
3. Follow **docs/SMOKE_TEST.md** manually; all steps pass.

### Status

- [x] Scripts added
- [x] Smoke test doc created
- [x] `npm run check` passes (lint + typecheck)
- [ ] Smoke test run and passed (run manually; see docs/SMOKE_TEST.md)

---

## Step 1 — UX Polish (SAFE)

**Goal:** Button safety (no double submit), consistent loading feedback, toasts, empty states, confirm dialogs, questionnaire polish.

### Changes made

- **A) UI foundation**
  - **Toast system** (`components/Toast.tsx`): `ToastProvider`, `useToast()`, `Toaster`. Types: success, error, info. Human-friendly messages only; auto-dismiss 4s. Wired via `AppClientWrapper` in `app/app/layout.tsx`.
  - **LoadingButton** (`components/LoadingButton.tsx`): props `isLoading`, `loadingText`, `children`, standard button props; shows spinner and disables while loading.
- **B) ManualActions polish** (`app/app/manual/[id]/ManualActions.tsx`)
  - All actions use `LoadingButton` or disabled state (Regenerate, Export PDF, Create share link, Delete manual); revoke shows “Revoking…” and disables during request.
  - Success toasts: “PDF downloaded”, “Share link created”, “Manual created”, “Manual deleted”, “Share link revoked”, “Link copied”.
  - Error toasts for export/share/regenerate/delete/revoke (friendly message); inline errors kept.
  - Share link UI: after create, shows read-only URL + “Copy link” button; copy triggers “Link copied” toast.
  - Confirm dialogs: Delete manual → “Delete this manual? This can't be undone.”; Revoke → “Revoke share link? People with the link will lose access.”
  - All fetches use `api()` helper.
- **C) Questionnaire autosave** (`app/app/new/page.tsx`)
  - Status under textarea: “Saving…” when in flight, “Saved” when last save succeeded.
  - On save failure: one persistent banner “Couldn't save. Retry” with **Retry** button that re-saves current answers.
  - “Convert to manual” disabled when `saveError`; message “Please save your answers before generating.” when can generate but save is failing.
  - Responses fetch and save use `api()` for consistency.
- **D) Dashboard** (`app/app/page.tsx`)
  - Empty state: friendly card with short app description + “Create your first manual” button.
  - When manuals exist: “Your manuals” list with clear timestamps (dateStyle: medium, timeStyle: short).
  - Copy: “Start new manual” → “Create a new manual”.
- **E) Error boundaries and loading**
  - Existing `app/app/error.tsx` and `app/app/manual/[id]/error.tsx` already show friendly messages and Try again / Dashboard.
  - Existing `app/app/loading.tsx`, `app/app/manual/[id]/loading.tsx`, `app/app/new/loading.tsx` provide skeletons for dashboard, manual page, questionnaire.

### What to test (Step 1)

1. **npm run check** → passes.
2. **Smoke test** (docs/SMOKE_TEST.md): full flow.
3. **Manual actions:** Share link create → URL shown → “Copy link” → “Copied” toast; Revoke → confirm “Revoke share link? People with the link will lose access.” → success toast; Export PDF → download + “PDF downloaded” toast; Delete manual → confirm “This can't be undone.” → toast + redirect to dashboard; Regenerate → loading state and success toast before redirect.
4. **Questionnaire:** After answering, see “Saving…” then “Saved”; simulate save failure (e.g. offline) → “Couldn't save. Retry” banner and Retry button; “Convert to manual” disabled with “Please save your answers before generating.” when save is failing.
5. **Dashboard:** No manuals → friendly empty-state card and “Create your first manual”; with manuals → list with timestamps; “Create a new manual” button label.

### Status

- [x] Toast + LoadingButton added and wired
- [x] ManualActions: loading states, toasts, confirms, copy link
- [x] Questionnaire: save status, retry banner, convert disabled when save failing
- [x] Dashboard: empty state, copy tweaks
- [x] Error/loading confirmed (no design overhaul)
- [x] `npm run check` passes
- [ ] Smoke test run and passed (run manually; see docs/SMOKE_TEST.md)

---

## Step 2 — Data + Versioning UX

**Goal:** Answers snapshot on manual creation, version history panel, share links UI clarity.

### Planned

- Add `manuals.answers_snapshot` (jsonb) if not present; store on manual creation; regenerate prefers snapshot.
- Manual page: “Version history” panel (read-only), link to each version.
- Share UI: show URL, created date, expiry, revoke.

### Status

- [ ] Not started

---

## Step 3 — Visual Refinement (UI-only)

**Goal:** Premium, minimal-expressive SaaS UI without changing backend, auth, routing, or data flow.

### Changes made

- **Design system (`components/ui.tsx`):**
  - Added `PageShell`, card primitives (`Card`, `CardHeader`, `CardBody`, `CardFooter`, `CardTitle`, `CardDescription`), typography helpers (`PageTitle`, `SectionTitle`, `BodyText`, `MutedText`).
  - Button system (`Button`, `ButtonLink`, `buttonClasses`) with **primary**, **secondary**, **destructive**, and **ghost** variants plus subtle hover/focus transitions.
  - `Badge`, `SectionDivider`, and `Stack` helpers for consistent badges, separators, spacing rhythm, and gentle fade-in of sections.
  - No logic changes; purely presentational and reusable across routes.
- **Color + tokens (`tailwind.config.ts`, `app/globals.css`):**
  - Kept light neutral background and deep ink text; introduced a single signature accent (`accent: #2563eb`) used for primary actions and focus states.
  - Added a small `fade-in-up` keyframe for subtle section entrance animations (no flashy motion).
- **Landing page (`app/page.tsx`):**
  - New hero with clearer emotional headline, subheadline, and trust copy: “No labels. No personality tests. Just clarity.”
  - Primary CTA (“Create your manual”) and secondary demo CTA, both using the shared button system.
  - Added three feature cards and a simple three-step “How it works” strip, plus a clean footer; no route or auth logic changed.
- **App layout (`app/app/layout.tsx`):**
  - Updated header to a softer, blurred bar with max-width container and a small `App` badge.
  - Kept all navigation (Dashboard, New manual, Demo, Admin, sign-out) identical in behavior; only visual styling and spacing changed.
- **Dashboard (`app/app/page.tsx`):**
  - Reframed header copy (“A simple home for ‘How to work with me’”) and aligned actions using `ButtonLink`.
  - Manual list now uses a card layout with version/context `Badge`s and readable timestamps; empty state is a structured card encouraging the first manual.
  - All links (to `/app/new` and `/app/manual/[id]`) preserved.
- **Questionnaire (`app/app/new/page.tsx`):**
  - Added step indicator with percent complete, `Badge` labeling the flow, and improved copy around autosave.
  - Question card uses the new card + typography system; textarea styling improved while preserving autosave and validation behavior.
  - Navigation buttons (Back / Next / “Convert to manual”) now use the shared `Button` variants; disable logic and routing unchanged.
- **Generate flow (`app/app/new/generate/page.tsx`):**
  - Context selection redesigned as three small “context cards” (general / work / partner) inside a `Card`, with clearer descriptions.
  - Premium-feeling generate button, refined error card (including OpenAI key hint) and secondary link back to questionnaire; same `/api/generate` logic and polling preserved.
- **Manual view (`app/app/manual/[id]/page.tsx`, `ManualActions.tsx`):**
  - Header now shows version/context badges and a short helper line; content is displayed in a document-style card with improved spacing.
  - `ManualActions` keeps all existing behaviors (regenerate, export PDF, create/revoke share link, delete) but uses cleaner button styling, badges for share hints, and refined error panels; all API calls unchanged.
- **Share view (`app/s/[token]/page.tsx`):**
  - More trustworthy layout with a small header (“How To Work With Me”, `View only` badge) and document-style content card.
  - Still `noindex`, still rate-limited, still view-only; only presentation updated.

### How to verify

1. Run `npm run check` → passes (no type or lint errors from UI changes).
2. Run `npm run build` (or `npm run build:check` with env set) → build succeeds.
3. Manually walk through:
   - Landing → Sign-in → `/app` dashboard (links and redirects behave as before).
   - Create new manual: `/app/new` → answer all questions → “Convert to manual” → `/app/new/generate` → generate → `/app/manual/[id]`.
   - Export PDF, create share link, copy link, revoke link, and delete manual from the manual view; confirm all server actions still succeed and toasts/errors are still shown.
   - Visit a public share link `/s/[token]`; confirm rate limiting and view-only behavior are unchanged and the page now uses the refined document styling.

### Status

- [x] Design system primitives added (cards, buttons, typography, badges, spacing)
- [x] Applied to landing, dashboard, questionnaire, generate, manual, and share views
- [x] No changes to auth, APIs, DB access, or data flow
- [ ] Full smoke test run with `npm run check` and `npm run build` (run manually)

---

## Step 3 — Security + Privacy Final Pass

**Goal:** Audit routes (auth, owner, deleted_at, Zod); share view (noindex, no auth, rate limit, no raw errors); logs and CSP.

### Status

- [ ] Not started

---

## Step 4 — Observability + Debuggability

**Goal:** Logging helper (request/action/error); standard event names; admin Troubleshooting page (ADMIN_USER_IDS).

### Status

- [ ] Not started

---

## Step 5 — Performance + Reliability

**Goal:** Fewer re-renders (questionnaire), debounce/polling correctness, all fetch via api(), client fetch timeouts (AbortController).

### Status

- [ ] Not started

---

## Step 6 — Docs + Deploy

**Goal:** README/DEPLOY updates (run locally, smoke tests, env vars, troubleshooting); DOMAIN_CHECKLIST.md (domain, Vercel, Clerk, Supabase, NEXT_PUBLIC_APP_URL, https, HSTS, CSP).

### Status

- [ ] Not started
