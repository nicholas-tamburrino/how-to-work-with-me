# QA test checklist

Use this checklist to verify core flows and security before release or after major changes.

---

## Auth

- [ ] **Landing → sign-in**  
  Click “Create Your Manual” from landing; redirects to sign-in. Sign in with existing account; redirects to `/app` dashboard (via `/auth/callback`).

- [ ] **Sign-up**  
  Sign up with new email; redirects to `/app` after verification (via `/auth/callback`).

- [ ] **Protected routes**  
  While signed out, visiting `/app`, `/app/new`, `/app/manual/any-id` redirects to sign-in (or 404). No flash of protected content.

- [ ] **Redirect flow (smoke)**  
  - Logged out: visit `/app/new` → should land on sign-in (with redirect to callback + `next=/app/new`). Complete sign-in → should land on `/app/new` (or `/app` at minimum).  
  - Direct visit to `/sign-in` → complete sign-in → should land on `/app`.  
  - Try both `http://localhost:3000` and `http://localhost:3001`; both should work if allowlisted in Clerk Dashboard (see README **Clerk Redirect Allowlist**).

---

## Access control

- [ ] **Cannot access another user’s manual**  
  Signed in as User A, open a manual URL that belongs to User B (use a known manual ID from DB or another account). Expect 404 or “Not found”, not the manual content.

- [ ] **Cannot access another user’s response**  
  Call `POST /api/responses` with a `responseId` that belongs to another user. Expect 404.

- [ ] **Share link revoke**  
  Only the manual owner can revoke a share link. Call revoke with a share link owned by another user (e.g. from another session); expect 404 or “Not found”.

---

## Rate limits

- [ ] **Generate**  
  Trigger manual generation 6+ times within 1 minute (same user). Expect 429 with a friendly message (e.g. “Too many attempts…”).

- [ ] **Export PDF**  
  Trigger PDF export 6+ times within 1 minute. Expect 429.

- [ ] **Share (create/revoke)**  
  Create or revoke share links 11+ times within 1 minute. Expect 429.

- [ ] **Share view (public)**  
  Open the same share URL 61+ times within 1 minute from the same IP. Expect rate limit message (e.g. “Too many views…”).

---

## Share links

- [ ] **Create share link**  
  On a manual, click “Create share link”. URL is shown once; copy it.

- [ ] **View share (incognito)**  
  Open the share URL in an incognito window. Manual content loads; no edit or app navigation; page is view-only.

- [ ] **Revoke**  
  As owner, revoke the share link. Open the same share URL again in incognito; content no longer loads (revoked or not found).

- [ ] **Expiry (if used)**  
  If you set `expiresInDays` when creating a link, after that date the share URL should no longer show content.

---

## PDF export

- [ ] **Export PDF**  
  On a manual, click “Export PDF”. A new tab or download starts with a PDF; content matches the manual (title page + sections).

- [ ] **Rate limit**  
  After triggering rate limit (see above), export fails with 429 until the window resets.

---

## Delete manual and delete all data

- [ ] **Delete my manual**  
  On a manual, click “Delete my manual” and confirm. Redirect to dashboard; that manual no longer appears in the list. Re-opening the manual URL shows 404.

- [ ] **Delete all my data**  
  On dashboard, click “Delete all my data”, confirm. All manuals and draft responses for that user are soft-deleted. Dashboard shows no manuals; questionnaire may show empty or a new draft.

---

## Job polling (generation)

- [ ] **Generate and wait**  
  Complete questionnaire, go to “Generate manual”, click “Generate Manual”. Button shows “Generating… (this may take a minute)”. After some time, redirect to the new manual. Manual content is present and valid.

- [ ] **Slow generation**  
  If generation is slow (e.g. API delay), polling continues; no premature “failed” or timeout before ~1 minute. When the job completes, redirect happens.

- [ ] **Failed job**  
  If generation fails (e.g. invalid response or API error), user sees an error message and can retry. No manual is created.

---

## Admin (if ADMIN_USER_IDS is set)

- [ ] **Admin link visible**  
  When signed in as a user whose ID is in `ADMIN_USER_IDS`, “Admin” link appears in the app header.

- [ ] **Admin page**  
  Open `/app/admin`. Audit logs table and failed jobs table load. No questionnaire answers or manual content is shown.

- [ ] **Revoke share link by ID**  
  As admin, enter a share link UUID and click “Revoke”. Link is revoked; opening that share URL no longer shows content.

- [ ] **Non-admin**  
  When signed in as a user not in `ADMIN_USER_IDS`, visiting `/app/admin` returns 404. “Admin” link is not visible.

---

## Smoke (post-deploy)

- [ ] **Health**  
  `GET /api/health` returns 200 and `{"status":"ok"}` when all required env vars are set.

- [ ] **Full flow**  
  Sign in → New manual → Answer all questions → Generate → View manual → Export PDF → Create share link → Revoke link → Delete manual (or delete all data). No console or server errors.
