# Local Supabase setup — blocked prerequisites

Observed: no docker, supabase, colima or podman executable; no Docker Desktop/OrbStack at standard application paths. Local Supabase cannot start here. No Docker/CLI installation, hosted project, migration application, privileged seed or auth account provisioning was performed.

Preparation files are unapplied. App still runs the approved local demo. `.env.example` contains empty placeholders and defaults to explicit demo mode. Do not set supabase mode expecting an implemented adapter yet.

## Resume locally

1. Install/start Docker Desktop or a compatible Docker runtime and the official Supabase CLI following [current local-development documentation](https://supabase.com/docs/guides/local-development/cli/getting-started). Verify `docker info` and `supabase --version`.
2. Discover `supabase --help`, `supabase init --help`, `supabase start --help`, `supabase migration new --help`, `supabase db reset --help` and `supabase test db --help` before running version-dependent commands.
3. Generate config with `supabase init`. Disable public signup; keep auth redirect URLs on local loopback only. Do not guess version-specific config fields.
4. Generate a local migration with `supabase migration new azzora_foundation`, review/import the draft and implement remaining transactions/storage policies before app writes.
5. Start locally and reset from zero with local-only CLI flags confirmed via help. Do not use `--linked`, remote URLs or a hosted project ref. Inspect local services without printing privileged keys.
6. Create deterministic seed from the existing seed.ts, using a fixed date and stable UUID mapping. The seed is not implemented yet; never import arbitrary browser data.
7. Provision only the small controlled auth test set via a loopback-only script. Passwords/service credentials must come from ignored local env, never committed literals or VITE-prefixed privileged variables.
8. Run prepared SQL tests and additional write/RLS/storage/transaction tests. Reset/seed/retest twice to prove reproducibility.
9. Implement async repository, Auth/login/store/UI permission/error states only once those boundaries can be tested. Preserve separate demo and authenticated browser suites.

Privileged scripts must validate host is `127.0.0.1`, `localhost` or `[::1]`, reject remote endpoints, avoid logging credentials and derive server actors from Auth. Avoid service-role credentials in frontend dependencies/bundle.
