# REPRO

**MAKE IT BREAK FIRST.**

A public software experiment: Groq proposes a hypothesis and a candidate patch; isolated execution supplies the targeted-test evidence. The token is a community identity, not a claim about investment returns or model accuracy.

## Current state

The website, server-side pipeline, Sandbox adapter, private Supabase adapter and schema are implemented. Live execution is **off by default**. Credentials, a dedicated database migration and provider-backed verification are required before opening the lab. The site never substitutes simulated results for a missing service.

The ten-chapter origin story in `content/story.md` is a creative narrative. It is not a record of confirmed personal experiences. Actual implementation notes live in `content/build-log/`.

## Run locally

Node.js 22.13+ or 24 is required; use Node 24 for the closest match to the execution image.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Visit http://127.0.0.1:3000. Without credentials, the story, source and build log work; the lab explains which service is unavailable. No code executes in the web process.

```powershell
npm run typecheck
npm test
npm run build
npm run test:live
```

`npm test` uses explicit test doubles to verify orchestration and safety invariants. It is **not** a live AI or Sandbox test. `npm run test:live` requires real credentials and exits 2 if they are missing. It saves private local evidence under ignored `evidence/`. Case 002 deliberately injects an incorrect candidate to test rejection; that candidate is labeled as a controlled test, not as an AI-generated patch.

## Configure the providers

1. Create a Groq API key in the official Groq console and set `GROQ_API_KEY` in `.env.local` or the Vercel project's server-side environment settings. Never send keys in chat or commit them. Default model: `openai/gpt-oss-120b`. The current documented strict-output allowlist is in `src/ai/groq.ts`. Other models use JSON mode plus runtime schema validation; unsupported provider requests fail visibly.
2. Link the **REPRO** Vercel project and run `vercel env pull .env.local` for a short-lived local OIDC credential. This replaces the local env file, so preserve manually configured values first. Deployments use automatic OIDC. External CI may use the three server variables `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID` instead.
3. Provision a **dedicated REPRO** Supabase project. Apply `supabase/bootstrap.sql` in its SQL editor. The script is repeatable and does not touch another product's tables. To use versioned CLI migrations, run `supabase migration new private_experiments`, copy this script into the returned migration file and run `supabase db push` against the confirmed REPRO project.
4. Set `SUPABASE_URL` and a **server-only** `SUPABASE_SECRET_KEY` (the service-role credential works here as well). Client roles have no direct database grants. Anonymous sessions receive a random 256-bit HttpOnly cookie; only its SHA-256 owner hash is stored. Every private result read filters both ID and owner.
5. Generate `REPRO_RATE_SALT` with a cryptographic random generator and store it server-side. Production refuses execution without a database and salt. Atomic database leases cap global concurrency at 2, per-session runs at 3/hour and IP-derived hashes at 12/hour. A 20-second minimum session interval also applies. No raw IP is stored.
6. Run provider-backed tests and review all evidence before setting `REPRO_EXECUTION_ENABLED=true`. Publish the switch in the Vercel environment and redeploy. Keep it false until database access controls, provider access and the execution harness are verified.

## Execution contract

This release accepts dependency-free CommonJS functions or deterministic scripts. For example:

```javascript
module.exports = function getUserId(user) {
  return user.id;
};
```

Describe the intended result: “Return null for missing users; return the id for existing users.” Groq chooses JSON arguments and expected results before any patch is generated. A fixed harness evaluates those assertions. ES modules, packages, browser APIs, network services, non-JSON return values and arbitrary repositories are outside this MVP.

Each code version gets a fresh non-persistent Firecracker VM, deny-all networking, one vCPU, no forwarded production secrets and a 30-second VM timeout. Each assertion runs the submission with Node permission restrictions, a 64 MB heap, bounded output and a 2.5-second timeout. The child cannot read the expected-value file. The web process never evaluates submissions. Sandboxes stop in `finally` blocks. An unexpected harness failure is not a reproduced bug.

`TARGET_TEST_PASSED` means only that the frozen, AI-generated target assertions passed. Test coverage and intent may be incomplete. Review the contract and candidate yourself. The reproduction match is a model judgment over real evidence; it is not a formal proof.

## Privacy and publication

Code and logs are private by default. Development without Supabase uses bounded process memory with a one-hour TTL; this mode is explicitly ephemeral and is disallowed in production. Anonymous capability cookies are not recoverable accounts: clearing the cookie loses access. The result can be downloaded as JSON.

Publishing requires an explicit confirmation preview. It exposes only a status receipt: experiment ID, timestamp, final status and test count. Code, descriptions and logs stay private. There is no public list endpoint. Database RLS is enabled with no client policies; only the server's secret credential can access records. Add an operational deletion/retention policy before collecting long-lived production submissions.

## Routes and actual source

- `/` — the complete first-person narrative, original chapter anchors and clearly marked examples.
- `/lab` — input form, real server progress, original evidence, candidate diff, unchanged-test verification and limitations.
- `/source` — explicit whitelist of real files, syntax highlighting and GitHub links.
- `/build-log` and `/build-log/[slug]` — Markdown implementation notes.
- `/lab/receipt/[id]` — explicitly published minimal receipt.

All routes share the story-led navigation and normal page footer. The Source file picker stays inside its page; every selected file expands in full, with long lines wrapping and no nested scrollbars. The Lab keeps its input and evidence views. A decorative Canvas distributes red pixel paths across the viewport and clears a soft area around actual text lines and the mascot. The clearing is refreshed for scrolling, layout, font and content changes. Animation is capped at 20 fps on desktop and 12 fps below 760px, with device pixel ratio capped at 1.5. It stops when the page is hidden. The footer motion toggle saves a local preference; the system's reduced-motion preference always takes priority and leaves a static background. This decoration never represents experiment activity.

## GitHub → Vercel

Repository: https://github.com/punfun123/repro

Production is intended to follow the `main` branch through the Git-linked REPRO Vercel project. CI runs type checking, unit tests and the production build. External credentials are configured only in the REPRO project. No GitHub or Vercel credentials are committed.

## Token launch

The single launch config is **`src/config/project.ts`**. Set the official `xUrl` once supplied. Set the real `solanaCA` and `isLaunched: true` only at launch. The address is decoded as base58 and checked for 32 bytes. `launchInfo()` generates `https://pump.fun/coin/<CA>` only for a valid launched configuration. Until then CA and BUY are disabled and the header says NOT LAUNCHED. No official X URL or contract was provided for this version.

```powershell
Set-Location 'D:\Codex\2026-10-16\files-mentioned-by-the-user-codex\outputs\repro'
# Edit src/config/project.ts with the real launch information first.
npm run typecheck
npm test
npm run build
git add src/config/project.ts
git commit -m "Configure REPRO launch"
git push origin main
```

After launch, verify the exact BUY destination and actual CA copy in the production browser. No token ownership check or financial utility is implied by this release.

## Official references checked during development

- [Sandbox SDK and network policy](https://vercel.com/docs/sandbox/sdk-reference)
- [Groq structured outputs and supported models](https://console.groq.com/docs/structured-outputs)
- [Supabase server-side inserts](https://supabase.com/docs/reference/javascript/insert)
- [Supabase changelog](https://supabase.com/changelog)

MIT licensed. The supplied mascot is used as the project reference asset.
