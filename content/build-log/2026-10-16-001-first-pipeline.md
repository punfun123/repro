# Building an experiment that can say “unverified”
2026-10-16
The first implementation separates a model’s hypothesis from the execution verdict.

The workspace started empty. This entry documents code written for this version, rather than a prior history of successful experiments.

## What changed

The Next.js app now has a readable origin narrative, a JavaScript experiment form, an actual source explorer and file-backed build notes. The supplied red pixel bug is the only mascot asset.

The experiment pipeline asks Groq to define correct-behavior assertions before seeing a patch. A server-side schema validates the result. The original and candidate run in separate Vercel microVMs. A fixed harness compares JSON return values or script stdout to the same frozen expectations. A model examines whether the original failure matches the reported bug; it does not set the verification verdict.

## Execution boundary

`src/sandbox/execute.ts` requests a non-persistent VM with deny-all networking, one vCPU and a 30-second lifetime. The harness gives each submitted process a 2.5-second timeout, a 64 MB JavaScript heap, bounded output and Node permission restrictions. Expected values stay in the parent harness. No production environment is forwarded to user code. The VM is stopped in a finally block.

## What is still a boundary

AI-generated tests can be incomplete or wrong. Passing the listed assertions is not a general proof. This first version supports small CommonJS functions and scripts with deterministic JSON or stdout behavior; no dependencies, browser APIs, repositories or async services.

Groq credentials and a dedicated Supabase project were not present during initialization. Live AI completion and database persistence must be verified after configuration. The public execution switch remains off by default. The repository includes reproducible tests and a provider-backed verification command; their measured results are recorded in the delivery documentation when run.

## Inspect the change

Open `src/experiment/pipeline.ts`, `src/verification/verdict.ts` and `scripts/runner.cjs` in the Source explorer. This note is dated for the actual implementation day. No previous commits or experiments are implied.
