## Goals

1. Pastor/Admin login button → admin-only auth page (sign in + create admin account), no member language.
2. Member login button → member-only auth page (existing flow, member wording).
3. Fix "Download PNG" on the ID Card page (currently uses `html2canvas`, which fails on modern CSS like `oklch()` colors used throughout the design system — that's why nothing downloads).

## Changes

### Routing / Auth split
- `src/routes/index.tsx`: change the two buttons to link to `/auth?role=admin` and `/auth?role=member` (or two separate routes — see below).
- Create two dedicated routes for clarity:
  - `src/routes/auth.admin.tsx` → "Pastor / Admin Portal" — Sign in + Create admin account tabs. On signup, the new user is granted the `admin` role via a new server function `createAdminAccount` (uses `requireSupabaseAuth`-free flow: signUp then call server fn to insert into `user_roles` — gated by a one-time bootstrap rule or open during initial setup; for now, allow self-registration as admin since this is the explicit pastor portal entry).
  - `src/routes/auth.member.tsx` → "Member Portal" — Sign in + Join (existing member signup).
- Keep existing `/auth` as a redirect to `/auth/member` for backwards compatibility, OR remove it. Plan: redirect.
- Both pages reuse a shared `<AuthCard>` component to avoid duplication (left scripture panel + right form card), with different titles, subcopy, and signup handlers.

### Admin role assignment
- New server function `signUpAdmin({ email, password, first_name, last_name })`:
  - Calls `supabaseAdmin.auth.admin.createUser({ email_confirm: true, ... })`.
  - Inserts `{ user_id, role: 'admin' }` into `public.user_roles`.
- Client calls this fn, then signs in with password.
- Note: this makes admin signup self-serve from the homepage. If you want it gated (invite code / first-admin-only), say so and I'll add that — otherwise this matches "create account for admin" as requested.

### ID card download fix
- Replace `html2canvas` with `html-to-image` (`toPng`), which handles modern CSS color functions (`oklch`, CSS variables, gradients) reliably. `html2canvas` silently produces blank/partial images with `oklch()`.
- Install `html-to-image`, remove `html2canvas` usage in `src/routes/_authenticated/id-card.tsx`.
- Ensure the member photo `<img>` has `crossOrigin="anonymous"` (Supabase signed URLs support CORS) so it renders into the PNG.
- Keep Print button as-is.

## Technical notes
- Files touched: `src/routes/index.tsx`, `src/routes/auth.tsx` (→ redirect), new `src/routes/auth.admin.tsx`, new `src/routes/auth.member.tsx`, new `src/components/AuthCard.tsx`, new `src/lib/admin-signup.functions.ts`, `src/routes/_authenticated/id-card.tsx`, `src/components/MemberIdCard.tsx` (add crossOrigin on img).
- Package: `bun add html-to-image`, `bun remove html2canvas` (or leave installed).
- `routeTree.gen.ts` regenerates automatically.

## Open question
Admin self-signup from the public homepage means anyone can create an admin account. Is that intended, or should admin creation require an invite code / be limited to the first admin only?