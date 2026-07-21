# Deploy DSA Copilot to Vercel

## Authentication modes

The app has a browser-only local account fallback for demos. Local accounts, profile data, submissions, solved problems, and progress are stored in that browser and are separated by account ID (with a separate guest scope). They are not shared across devices.

For production sign-in, configure Supabase Auth. The app supports email/password registration and login plus Google, Apple, and GitHub OAuth through Supabase.

## Deploy from GitHub

1. Push the project to a GitHub repository.
2. Open [Vercel](https://vercel.com/new).
3. Import the repository.
4. Keep the detected framework as **Next.js**.
5. Use these defaults:

   ```text
   Build Command: npm run build
   Install Command: npm install
   Output Directory: .next
   ```

6. Add the environment variables listed below.
7. Deploy and test the production URL.

Vercel detects this Next.js project from `package.json`; no `vercel.json` file is required.

## Deploy with the Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
vercel --prod
```

Run these commands from the project root.

## Environment variables

Add environment variables in **Vercel Project Settings -> Environment Variables**. Never use a `NEXT_PUBLIC_` prefix for Gemini, Judge0, database, service-role, or OAuth secrets.

### Required for Gemini code review

```text
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_API_KEY` is read only by server-side route handlers. It powers live code review, Run/Submit review decisions, and AI-generated Big-O complexity analysis. If it is omitted, the local fallback reviewer is used.

### Required for Supabase production authentication

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

In Supabase:

1. Enable Email under Authentication -> Providers.
2. Enable Google, Apple, and GitHub and configure their OAuth credentials.
3. Add these redirect URLs under Authentication -> URL Configuration:

   ```text
   http://localhost:3000/auth/callback
   https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback
   ```

4. Redeploy after changing environment variables.

The Supabase anon key is public by design, but any Supabase database tables must have appropriate Row Level Security policies. No Supabase database schema or migrations are included in this repository, so RLS must be verified in the Supabase dashboard before storing production progress data there.

### Optional variables

These are documented in `.env.example` for future integrations:

```text
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=
```

Do not commit real values. Keep `SUPABASE_SERVICE_ROLE_KEY`, `JUDGE0_API_KEY`, `DATABASE_URL`, and any OAuth client secrets server-side.

## Local environment setup

Copy `.env.example` to `.env.local` and fill in the values you need:

```bash
copy .env.example .env.local
```

The `.env.local` file is ignored by Git. Do not paste its secret values into source files, screenshots, README files, or client-side code.

## Files relevant to Vercel

- `package.json` - project metadata and build script.
- `package-lock.json` - locked dependency versions.
- `.env.example` - variable names and placeholders only.
- `.gitignore` - excludes environment files, build output, dependencies, and Vercel metadata.
- `DEPLOY.md` - this deployment guide.

## Verify before deploying

Run from the project root:

```bash
npm install
npm run build
npm run dev
```

Test:

- Dashboard navigation and current-user name
- Problem filtering and account-specific solved state
- Editor indentation, brackets, and language switching
- Gemini live review when `GEMINI_API_KEY` is configured
- Run, Submit, hidden-test verdicts, and solved status
- Complexity tab showing AI-reviewed Big-O time and space complexity
- Visualization controls
- Account-specific Progress and Daily Activity history
- Profile editing and password-confirmed account deletion
- Supabase email/password and OAuth flows after provider setup

## Current MVP limitations

The app is suitable for a demonstration. Authentication and progress are not yet backed by a hosted application database, so browser-stored progress is not shared between devices. For production-scale persistence, add a database with per-user ownership, server-side submission storage, rate limiting, and sandboxed code execution such as Judge0.
