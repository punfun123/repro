# I gave each recorded stage an evidence view
2026-10-16
I already had a streaming pipeline. The useful next step was to make its decisions inspectable without building a second system to animate them.

The Lab was reporting real events, but reading a sequence of status names still asked the reader to reconstruct the experiment. I added four small nodes for Analyze, Reproduce, Patch and Verify, and made each one open the evidence already stored for that stage.

## I made the graph follow the record

The graph receives the same experiment snapshots as the existing SSE response. I derive its states in a pure mapping function, so the animation has no authority to finish a step. Missing evidence stays visible as missing evidence. If expected behavior needs review, execution is skipped. If the original does not reproduce, Patch and Verify stay skipped.

The red mascot follows that same boundary. It moves slightly during analysis and reproduction, and a second bug appears only after the record contains a confirmed `REPRODUCED` event with original failure evidence. A proposed patch keeps its own label. Green target-test feedback requires both confirmed reproduction and matching, passing verification assertions.

I checked those rules with snapshots from the actual pipeline driven by explicit test doubles. A wrong candidate, an unrelated original error, a provider failure and an unsupported pass all keep their distinct outcomes. None of those controlled tests is a new live AI experiment.

## Refresh needed an identity, not a copy of the code

The server already saves progress snapshots. I reused the existing owner-checked record endpoint to restore the most recent experiment after a refresh, and to poll a saved active record when its event stream is no longer attached. The browser remembers only an experiment ID in session storage; code, logs and owner credentials are not copied there.

I also kept the diff tied to the saved input and candidate rather than the editor's current text. That matters once a developer starts editing another submission. The comparison now has real added and removed lines, original and candidate line numbers, syntax tokens and explicit target-test status. Code and model output are rendered as escaped text.

## The old Sandbox run had a useful missing field

For the public Build Log diagram I read the committed Sandbox artifact. It contains three hand-written fixtures, their assertion results and individual assertion durations, but no aggregate duration for each harness command. I display that total as unrecorded instead of adding the child timings and calling the sum an execution time.

That diagram deliberately shows the original, passing fixture and wrong fixture. It does not draw Groq analysis or claim an AI generated either candidate. The wrong fixture still shows the informative result from the original artifact: child exit `0`, failed assertions, harness exit `1`.

## What I verified

The original fifteen tests and ten new state, diff, token and artifact tests pass. Chromium checks at 1440 and 390 pixels exercised a locally controlled SSE response, saved-record recovery, failure and unverified branches, code comparison, clipboard access, narrow layouts and reduced motion. Source still displayed complete real files; the public fixture diagram matched the committed outputs. No application errors or injected script execution appeared.

The live service check still reports no Groq configuration and no configured database. Sandbox credentials are available, and public execution stays disabled. The new views make existing behavior easier to inspect; they do not establish a provider-backed AI run that has not happened.

## Follow the code

The [state mapping](/source?file=visualization), [SSE request entry](/source?file=api), [pipeline](/source?file=pipeline) and [verdict function](/source?file=verdict) remain inspectable. The historical controlled outputs are still in [`sandbox-harness.json`](https://github.com/punfun123/repro/blob/main/content/evidence/sandbox-harness.json).
