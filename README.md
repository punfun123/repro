# REPRO

**MAKE IT BREAK FIRST.**

A public research environment for software failure, reproduction, diagnosis and verification. The Observatory executes bounded local behavior models and exposes their internal state. The token is a community identity, not a claim about investment returns or model accuracy.

## Current state

The Observatory, Experiments and Diagnostics work without AI keys, a database or Sandbox access. Eleven distinct rule families cover nullish access, array boundaries, recursion, defaults, state identity, callback ordering, validation, regressions, sorting, retries and promise settlement. The generator-based TypeScript evaluator produces execution events with captured bindings and contexts. Draining that same evaluator produces the input heatmap and patch verification matrix. Displayed source is never evaluated in production.

The public field is labeled as a **DETERMINISTIC LOCAL MODEL** with a simulated input space. Passing model conditions do not turn it into a verified historical record. The existing controlled Sandbox artifact remains a separate **VERIFIED RECORD**, with its original outputs and commit link. The earlier 24 curated fixtures remain covered by regression tests.

The original server-side pipeline, Groq adapter, Sandbox adapter, private Supabase adapter, tests and schema are retained. The production research UI does not invoke them. Their live execution remains **off by default** and still requires verified provider, database and access configuration.

The ten-chapter origin story in `content/story.md` is a creative narrative. It is not a record of confirmed personal experiences. The first-person development diary in `content/build-log/` follows the implementation, commits, tests and experiments that can be checked.

## Run locally

Node.js 22.13+ or 24 is required; use Node 24 for the closest match to the execution image.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Visit http://127.0.0.1:3000. The research pages, complete Origin story, actual Source and Build Log all work without provider credentials. The browser runs the bounded curated operation model, never pasted or generated JavaScript.

```powershell
npm run typecheck
npm run validate:data
npm test
npm run build
npm run test:live
```

`npm run validate:data` checks the current public fields against incrementally executed assertions at multiple parameter settings, including absent contracts. It also checks the earlier fixture identities, exact diffs, graph targets and denominators. `npm test` retains earlier orchestration and safety checks and adds input-boundary, alias-snapshot, recursion-budget, scheduler and grid/trace consistency tests. In development only, trusted curated snippets execute in Node VM contexts to check output parity. These are local tests, **not** live AI or new Sandbox records. `npm run test:live` is a retained optional legacy tool requiring real credentials; it saves private evidence under ignored `evidence/`.

## Preserved provider pipeline (optional; not used by the Observatory)

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

- `/` — Execution Field: profiler-style event bands, variable snapshots, input heatmap, patch matrix and source comparison.
- `/experiments` — searchable, type-filtered collection of eleven rule families with full inspection.
- `/diagnostics` — manual investigation of the selected case, input and code version.
- `/lab` — retained route to the same simulated experiment collection.
- `/origin` — the complete ten-chapter first-person narrative, original chapter anchors and clearly marked examples. Old root chapter links forward here.
- `/source` — explicit whitelist of real files, syntax highlighting and GitHub links.
- `/build-log` and `/build-log/[slug]` — a first-person development diary grounded in source, commits, tests and recorded runs.
- `/lab/receipt/[id]` — explicitly published minimal receipt.

All routes share the research Explorer and mobile menu. The Source file picker stays inside its page; every selected file expands in full, with long lines wrapping and no nested scrollbars. A decorative pixel Canvas fills the viewport, behind opaque instruments and masked text. Its saved motion preference and system reduced-motion setting control animation. Fine-pointer devices have a subtle cursor follower; touch and reduced-motion modes disable it. The supplied front-facing red bug is used unchanged as the small brand mark and site icon.

## Research model and provenance

`src/research/catalog.ts` defines eleven public models, parameterized input fields and independent contracts. `src/research/interpreter.ts` is the canonical generator evaluator. `src/research/computation.ts` derives cell observations and yields selected or sweep executions with assertions. `use-computation.ts` owns the single session consumed by all views. The earlier `cases.ts`, `engine.ts` and playback reducer remain available for fixture regression checks.

Case and code-version selection are shareable in query parameters. Changing inputs, contracts, budgets or versions recomputes the field and resets its generator coherently. The homepage starts actual local computation automatically; manual selection interrupts it. Play, pause, step, replay and reset control generator advancement and captured-event inspection. A cycle can finish and remain inspectable. The event capture budget is 4,096; recursive depth is at most 24. Cadence changes presentation pace, never rule semantics. Auto-play pauses in a hidden document; reduced motion starts paused with manual controls available.

The code comparison uses `diff` and Prism tokens rendered as escaped React text. Heatmap and matrix results share their exact input, version and contract. Expected rejection counts as meeting a contract; a normal return can still fail. Missing expectations or model-coverage limits produce UNKNOWN. No heap usage, server duration, remote AI activity or success rate is fabricated. Sorting uses an explicit reference algorithm and asynchronous ticks are logical inputs.

Source separates the current research model from the collapsed static map of the retained provider pipeline. Build Log 002 still reads the original public Sandbox artifact: three hand-written controlled fixtures in one disposable VM, without a Groq call. Unrecorded timings stay unknown. All earlier logs and the complete raw Origin text remain unchanged.

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
