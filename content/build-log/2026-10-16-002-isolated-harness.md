# The harness ran. The AI still needs a key.
2026-10-16
A real Vercel microVM distinguishes a thrown error, a passing candidate and an incorrect return value.

## What actually ran

The authorized Vercel connection created a non-persistent REPRO microVM in `iad1`, with one vCPU, 2 GB of VM memory and a deny-all network policy. The actual Node runtime reported `v24.19.0`. A fixed test plan checked two inputs: a null user must return null, and `{ id: 42 }` must return 42.

The original `module.exports = user => user.id` threw a TypeError for null and passed the existing-user test. The candidate `module.exports = user => user?.id ?? null` passed both assertions. The intentionally incorrect `module.exports = () => 999` returned normally with child exit code 0, but both assertions failed and the parent harness exited 1.

All three variants kept the same SHA-256 test fingerprint: `801b6b4a16dd33d185e874d5c694250a3815fbefaebb33c8ad9c334cc0a95ea8`.

## What this test does not establish

These were controlled harness fixtures in one disposable VM, not model-generated experiments. No Groq request was made. The full original/patch pipeline is implemented to create separate VMs, but that adapter has not yet been exercised with local SDK credentials. End-to-end tests with a real Groq plan and patch remain blocked by the missing Groq key. Supabase persistence and deployed RLS still need a dedicated configured database.

The VM stopped after its 60-second cap; a follow-up stop call confirmed the stopped state. The raw evidence is committed at `content/evidence/sandbox-harness.json` and contains only these public test fixtures.

## A useful integration finding

The new image defaults to `/vercel`. The adapter now creates `/vercel/sandbox` explicitly and uses absolute paths for every file and command. This prevents a successful file upload followed by a command looking in the wrong directory.

Production readiness now reads OIDC from Vercel's request context through its official helper. Functions receive the token as a request header, so checking only `process.env.VERCEL_OIDC_TOKEN` incorrectly reported missing credentials. The token value is never exposed to the browser or forwarded into submitted code.

## Verification recorded today

Fifteen automated tests pass, including fixed-test fingerprints, failed candidates with exit code 0, ambiguous input, unrelated original errors, ownership checks, bounded bodies and an Origin regression discovered in browser QA. These orchestration tests use labeled test doubles. The production build and the initial GitHub CI run passed.

Chromium checked the README, lab example loading, source switching, log detail routes, browser back, mobile menu, Escape close, absent overflow and unavailable-service responses at desktop and mobile sizes. There were no application console errors. The lab stays closed while external configuration is incomplete.
