# A program can exit cleanly and still be wrong
2026-10-16
I ran three small functions in a real Vercel microVM to see whether the assertions, rather than the process exit code, would decide the result.

I wanted a concrete answer to one narrow question: if JavaScript finishes without crashing, will my harness still catch a wrong value? I fixed two expectations first. A missing user should return `null`; a user with `id: 42` should return `42`.

## What the run showed

I used a disposable, network-denied REPRO microVM in `iad1`. Its Node runtime reported `v24.19.0`. The original function, `user => user.id`, threw a `TypeError` for the missing user and passed the existing-user case. The candidate, `user => user?.id ?? null`, passed both assertions.

Then I ran a deliberately wrong function that always returned `999`. It exited normally inside the child process with code `0`. Both assertions still failed, so the trusted runner exited with code `1` and recorded a failed candidate. All three variants carried the same frozen test fingerprint: `801b6b4a16dd33d185e874d5c694250a3815fbefaebb33c8ad9c334cc0a95ea8`.

That last run was the useful one. A green process exit answers “did it finish?” The assertions answer “did it return what I asked for?” REPRO has to keep those questions separate.

These were controlled fixtures that I ran through the real Sandbox harness. I did not make a Groq request or ask an AI to generate the passing patch. I recorded the raw outputs in [`sandbox-harness.json`](https://github.com/punfun123/repro/blob/main/content/evidence/sandbox-harness.json) so the distinction is inspectable.

## The environment had its own assumptions

The first harness wiring exposed a path bug. The Node image started in `/vercel`, while I launched the command from `/vercel/sandbox`. Relative file writes could succeed in one directory as the runner looked in another. I now create `/vercel/sandbox` explicitly and use absolute paths for the submitted file, plan, runner and worker. That small change turned an easy-to-miss setup failure into a predictable execution contract.

I also found why Vercel was reporting execution as unavailable even when the deployment could supply its OIDC credential. In a Function, the token is available through Vercel's request context; checking only `process.env.VERCEL_OIDC_TOKEN` misses it. I switched the readiness check to the official `@vercel/oidc` helper. The token stays on the server and is never forwarded to submitted code.

## What I can claim today

The current fifteen automated tests pass. They exercise orchestration with labeled AI and runner test doubles: fixed fingerprints, incorrect candidates, ambiguous behavior, unrelated failures, private ownership, bounded requests and origin checks. They call no live AI provider.

The microVM smoke test is real, but the full provider path is still unverified. A Groq key is needed to run a model-generated plan and patch end to end, and Supabase still needs its dedicated project and policies configured. I keep the public Lab closed until those pieces and their results can be checked.

This run changed how I think about “passing.” I now read it as a precise sentence: these assertions passed in this environment. Anything beyond that sentence needs more evidence.

## Follow the code and commits

I fixed the Sandbox paths and added the harness evidence in [commit d42fc38](https://github.com/punfun123/repro/commit/d42fc38). I corrected Vercel's runtime credential detection in [commit 3d35ba7](https://github.com/punfun123/repro/commit/3d35ba7). The relevant files are [sandbox execution](/source?file=sandbox), [assertion harness](/source?file=harness), [verdicts](/source?file=verdict) and [orchestration tests](/source?file=tests).
