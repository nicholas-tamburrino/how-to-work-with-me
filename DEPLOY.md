# Production deployment (Vercel)

This guide covers deploying **How To Work With Me** to Vercel with production hardening.

---

## 1. Vercel project setup

1. Push your repo to GitHub/GitLab/Bitbucket and import the project in [Vercel](https://vercel.com).
2. Framework preset: **Next.js**. Root directory: repository root.
3. Build command: `npm run build` (or `npm run build:check` to validate env before build).
4. Output: default (Next.js).
5. Install command: `npm install`.

---

## 2. Environment variables

Set these in Vercel: **Project → Settings → Environment Variables**. Apply to **Production** (and Preview if you want).

### Required

| Variable | Description | Example / note |
|----------|-------------|----------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | From Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk secret key | Server-side only |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key | From Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Server-only; never expose |
| `OPENAI_API_KEY` | OpenAI API key | Server-only |

### Recommended for production

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Full production URL, e.g. `https://howtoworkwithme.vercel.app`. Used for share link URLs. |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (for rate limiting across instances). |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token. |

### Optional

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Default `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Default `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Default `/app` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Default `/app` |
| `ADMIN_USER_IDS` | Comma-separated Clerk user IDs allowed to access `/app/admin`. |

---

## 3. Clerk production config

1. In [Clerk Dashboard](https://dashboard.clerk.com) → your application → **Domains**, add your Vercel domain (e.g. `howtoworkwithme.vercel.app`).
2. Under **Paths**, set Sign-in URL, Sign-up URL, and after-sign-in/after-sign-up URLs if you overrode them with env vars.
3. Ensure production URL is in **Allowed redirect URLs** and **Allowed origins** if you use redirects or popups.

---

## 4. Supabase production

1. Use a **production** Supabase project (or a dedicated one for this app).
2. In SQL Editor, run in order:
   - `supabase/schema.sql`
   - `supabase/rls.sql`
3. Create storage bucket `pdf-exports` (private).
4. In Supabase → Settings → API, copy the production URL and keys into Vercel env.

---

## 5. Verifying `/api/health`

After deploy:

```bash
curl -s https://your-domain.vercel.app/api/health
```

- **200** with `{"status":"ok"}`: required env vars are set and the app is healthy.
- **503** with `{"status":"unhealthy","missing":["..."]}`: one or more required env vars are missing. Fix in Vercel and redeploy.

Use this URL in your monitoring or load balancer health checks.

---

## 6. NODE_ENV and production behavior

- On Vercel, **NODE_ENV is set to `production`** for production deployments. You do not set it manually.
- In production the app:
  - Enables **HSTS** (Strict-Transport-Security).
  - Logs **JSON** from the safe logger (event + metadata only).
  - Uses **Upstash** for rate limiting when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set; otherwise in-memory limits (per instance).

Preview deployments use the same code; set env vars for Preview if you need full behavior there.

---

## 7. Domains and HTTPS

- Vercel provides **HTTPS** by default for `*.vercel.app` and custom domains.
- For a **custom domain**: add it in Vercel → Project → Settings → Domains. Add the same domain in Clerk allowed domains/origins.
- Always use **HTTPS** in production; the app sends HSTS when `NODE_ENV=production`.

---

## 8. Post-deploy smoke test

Run through this checklist after the first production deploy:

1. **Health**
   - `GET https://your-domain/api/health` → 200 and `{"status":"ok"}`.

2. **Landing and auth**
   - Open the root URL → landing page loads.
   - Click “Create Your Manual” → redirect to sign-in/sign-up.
   - Sign up or sign in → redirect to `/app` dashboard.

3. **App flow**
   - Click “Start new manual” → questionnaire loads.
   - Answer at least one question → wait for “Saved” (or autosave).
   - Complete all questions → “Generate Manual” → wait for “Generating… (this may take a minute)” then redirect to manual viewer.

4. **Manual actions**
   - On the manual page: “Export PDF” → new tab with PDF or download.
   - “Create share link” → URL shown once; open it in an incognito window → view-only manual loads.
   - “Revoke” the share link → open the same link again → no content or error (revoked).

5. **Privacy**
   - “Delete my manual” → confirm → redirect to dashboard; manual no longer in list.
   - “Delete all my data” on dashboard → confirm → all manuals and draft answers removed.

If any step fails, check Vercel function logs and env vars (no secrets in logs).
