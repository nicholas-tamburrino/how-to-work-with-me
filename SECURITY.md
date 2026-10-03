# Security Checklist – How To Work With Me

## Implemented

- [x] **Authentication:** Clerk; login required for app (no guest mode in MVP).
- [x] **Authorization:** Every DB read/write scoped by `user_id`; manual/share access checked against current user.
- [x] **API keys:** OpenAI and Supabase service role key used only server-side; never exposed to client.
- [x] **Share links:** 32-byte random token; only SHA-256 hash stored; raw token shown once on creation; view-only public page; revocable; optional expiry (DB field ready).
- [x] **Public share route:** `/s/[token]` is noindex (metadata), view-only, no edit.
- [x] **Rate limiting:** In-memory limits on `/api/generate`, `/api/share`, `/api/export-pdf` (per user). Replace with Redis/upstream limits in production.
- [x] **Secure headers:** X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Content-Security-Policy (Clerk/Supabase allowed). HSTS enabled in production.
- [x] **Logging:** No logging of raw questionnaire answers or full manual content in application code.
- [x] **Markdown rendering:** Safe renderer (react-markdown, no raw HTML); no script injection.
- [x] **Input validation:** Questionnaire answers sanitized (known question IDs, string length cap); generation request validates response ownership.
- [x] **Strict API validation:** All mutation endpoints validate request body with Zod schemas (`lib/api-schemas.ts`). Invalid payloads return 400; no sensitive detail in error messages.
- [x] **Markdown sanitization:** Manual content is rendered with `SafeMarkdown` (react-markdown, no `rehype-raw`). Raw HTML in markdown is escaped; only allowed elements (headings, paragraphs, lists) are rendered. No script injection.
- [x] **Share route privilege:** Public `/s/[token]` is read-only. Lookup is by token hash only; no auth, no write, no escalation. Owner actions (create/revoke share links) require auth and manual ownership.

## Production recommendations

- [x] **CSP:** Content-Security-Policy set in next.config.js (self + Clerk + Supabase).
- [x] **HSTS:** Strict-Transport-Security (max-age=31536000; includeSubDomains; preload) when NODE_ENV=production.
- [ ] **Rate limiting:** Use Redis or platform rate limits (e.g. Vercel) for generate/share/export.
- [x] **Audit log:** `audit_logs` written on manual_created, manual_exported, share_link_created, share_link_revoked (ids only, no content).
- [ ] **Stripe:** When adding payments, use feature flag; keep API keys server-side; validate webhooks.
- [ ] **Secrets:** Rotate Clerk, Supabase, OpenAI keys if ever exposed; use env-specific keys for prod.

## Data model (security-relevant)

- `responses`: answers JSONB; access by `user_id` only.
- `manuals`: content_markdown; access by `user_id` only.
- `share_links`: token_hash only (no plaintext token); manual ownership enforced for create/revoke.
- `audit_logs`: for future use; no PII in metadata.
