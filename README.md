# How To Work With Me

A web app that turns a short questionnaire into a plain-language personal communication manual. The manual is built only from the user's own answers: no personality tests, no labels.

**Status:** working locally and in active development. Not yet deployed. See [Known issues](#known-issues) and [Roadmap](#roadmap).

## What it does

1. The user signs in and answers a multi-step questionnaire (answers autosave).
2. The server sends the answers to a language model and generates a manual.
3. The manual is checked before it is stored. It must contain six required sections, in order, and must not contain blocked terms. If the check fails, the model is retried once with stricter instructions. If it still fails, nothing is stored and the user sees a safe error.
4. The user can view, regenerate, export to PDF, share by link, or delete the manual.

The six sections: Best Ways to Communicate With Me, How I Make Decisions, Stress Signals & Support, What Motivates Me, Boundaries You Should Know, Best Way to Work With Me (Summary).

## Tech stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Clerk for authentication
- Supabase for the Postgres database and file storage
- OpenAI API, called from the server only (the key is never sent to the browser)
- Optional: Upstash Redis for rate limiting

## Security and privacy design

- Row-level security policies in Supabase; ownership is also checked in application code on every request
- Unauthorized access returns 404, not 403, so the app does not reveal whether a resource exists
- Share links use a long random token; only a hash is stored; links are view-only, revocable, and can expire
- Rate limits: generate 5 per minute, PDF export 5 per minute, share create/revoke 10 per minute, public share view 60 per minute per IP
- Logs and analytics events hold IDs and counts only, never questionnaire answers or manual text
- Soft delete for manuals and responses, plus a "delete all my data" action
- Security headers: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy

## Run it locally

You need Node.js, a Clerk application, a Supabase project, and an OpenAI API key.

```bash
npm install
cp .env.example .env.local   # on Windows PowerShell: Copy-Item .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk dashboard |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase, Settings, API |
| `OPENAI_API_KEY` | OpenAI platform |

Then:

1. In the Supabase SQL editor, run `supabase/schema.sql`, then `supabase/rls.sql`.
2. Create a private storage bucket named `pdf-exports`.
3. In the Clerk dashboard, add `http://localhost:3000` and `http://localhost:3000/auth/callback` (and the `/app` paths) to the allowed redirect URLs. Without this, sign-in can complete but the browser stays on the sign-in page.
4. Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

Quality checks:

```bash
npm run check         # lint and typecheck
npm run build:check   # environment check and production build
```

## Project structure

```
app/            routes: landing, sign-in, dashboard, questionnaire, manual viewer, share view, API
lib/            shared logic: Supabase, AI generation, validation, security, rate limiting
components/     UI components
supabase/       schema.sql and rls.sql
docs/           QA checklist, polish phases
```

## Testing

There is a manual QA checklist in `docs/QA.md` covering sign-in, access control, rate limits, share links, PDF export, deletion, job polling, and the admin page. Automated tests are not written yet.

## Known issues

- After sign-in, redirects depend on the Clerk allowed-URL list being set up correctly (see step 3 above). A custom `/auth/callback` route was added to make the redirect reliable; the full sign-in smoke test has not yet been recorded as passed.
- The end-to-end smoke test in `docs/QA.md` is not yet fully checked off.

## Roadmap

- Finish the smoke test and record the results
- Add automated tests for the validation and access-control code
- Add version history for regenerated manuals
- Add structured logging and a troubleshooting page for admins
- Deploy to Vercel with a public URL

## How it was built

Built independently by Nicholas Tamburrino, using ChatGPT and Claude as development aids. Architecture, security decisions, and review of the code are my own responsibility.

## License

No license has been chosen yet. All rights reserved until one is added.
