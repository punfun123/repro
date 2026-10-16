# I froze the tests before I asked for a fix
2026-10-16
The first hard rule in my implementation was that a patch could not move the test that would judge it.

When I started wiring REPRO together, I had to decide where the final say would live. Letting a model describe a bug, write a fix and declare that fix successful would make the most important result depend on the same voice that proposed it. I split those jobs into separate steps and gave the runner the verdict.

## I made expected behavior the first artifact

The first Groq call turns the report and the user's expected behavior into a small test plan: one to six named cases, JSON arguments, expected values, a hypothesis and limitations. I validate that response against a server-side Zod schema. If the behavior is ambiguous, REPRO stops at `NEEDS_REVIEW` and runs no submitted code.

That order matters. I freeze the plan before asking for a patch, so the model cannot quietly make its proposed change look successful by changing what the test expects.

## I kept the verdict outside the model

For a valid plan, `runExperiment` keeps a canonical copy and computes a SHA-256 fingerprint from the mode, export name and assertions. Each model call and each runner receives its own clone. The trusted `verdict` function then checks the returned fingerprint, the number of assertions, the process exit code and every assertion result.

The original code runs first in a fresh network-denied Vercel microVM. A failed assertion is only the beginning: the model has to compare the observed failure with the reported issue. An unrelated exception or an uncertain match ends as `UNVERIFIED`; no patch is requested. Only after a matching failure does REPRO ask for one candidate and run it in another clean microVM against the unchanged plan.

This gives the pipeline useful ways to stop. An ambiguous report can need review. A failure that does not match can stay unverified. A candidate can fail. A target test can pass while the broader program remains unverified. I want each status to say what the evidence supports, without letting generated prose choose the status.

## The boundary I left visible

This version accepts small, dependency-free CommonJS functions and deterministic scripts. It does not run packages, browser APIs, arbitrary repositories or asynchronous services. The targeted cases can be incomplete, so a pass is evidence about those listed inputs, not a general correctness proof.

I implemented the Groq and sandbox adapters, but their existence in the repository does not mean a live AI experiment has happened. Provider credentials and a dedicated configured database are still required before public execution can open. Until then, the honest result in the Lab is unavailable.

The decisive choice in this first implementation was where I made REPRO stop and what the software requires before it may claim a result.

## Follow the code

I put the initial pipeline in [commit 0db6513](https://github.com/punfun123/repro/commit/0db6513). The public explorer opens the [pipeline](/source?file=pipeline), [Groq adapter](/source?file=groq), [sandbox runner](/source?file=sandbox), [assertion harness](/source?file=harness) and [verdict function](/source?file=verdict).
