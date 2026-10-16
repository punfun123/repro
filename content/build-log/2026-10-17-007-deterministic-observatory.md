# I stopped drawing stages and started recording execution
2026-10-17
I needed the first screen to show what a program was doing internally. A sequence of stage boxes could explain the workflow, but it could not explain why a particular input broke a candidate repair.

## I moved the computation underneath the picture

I kept the complete Origin story, the original provider pipeline and every earlier engineering record. This work concerns the browser research interface. It does not establish a new online AI experiment or a new Sandbox result.

The public engine now evaluates eleven distinct rule families: property access, array indexing, recursive factorial, fallback values, object state, callback ordering, allocation boundaries, discounts, sorting, retries and promise settlement. Each has an original and two candidate rules, an input space and an independently defined behavior contract.

I made the evaluator a generator. Advancing it executes until the next read, write, condition, call, return or exception. That event captures the current bindings and context. Pausing the trace stops advancing the generator; it does not merely stop a CSS animation.

The condition heatmap drains the same evaluator over the input field. The verification matrix consumes those same results. I can select a matrix cell and inspect the corresponding rule execution without introducing another implementation of the program's behavior.

## An exception disappearing was the less interesting result

The property-access case helped me decide what the interface needed to preserve. A truthiness fallback removes the exception for a null receiver. It also turns the valid id `0` into null. The candidate looks safer if I only count exceptions; it fails as soon as I compare its result with the required behavior.

That is why the matrix includes the original alongside both patches. Some original conditions already pass. A repair must preserve those conditions as well as address the reported failure. Clicking the falsy-id region exposes a normal return with the wrong value, rather than an exception dressed up as a successful fix.

I also needed a distinct representation for undefined. JSON has no such value, so the model reserves an explicit sentinel. Null, undefined, an absent property, false, zero and an empty string remain distinguishable throughout input generation and assertions.

## The boundary cases found a boundary in my own implementation

While checking array lookup, I noticed that using a nullish fallback for an indexed result would replace a real null element with the undefined sentinel. I changed the lookup to test for undefined explicitly and added a null-element assertion. The same test checks negative and fractional indices. Fixing an inclusive upper bound alone still leaves the lower bound unprotected.

Recursion required a different distinction. An invalid negative factorial descends away from its base case. A deliberate domain guard rejects that input with RangeError. I kept the modeled recursive-overflow class separate from the expected rejection. A positive input that exceeds the selected depth budget becomes unknown model coverage, never a passing result.

For asynchronous ordering I used logical completion ticks, not invented network timing. The two callbacks complete in an input-defined order. A first-response rule can be wrong just as a last-response rule can be wrong; the latest requested value needs its own acceptance condition. Selecting an event shows which callback was allowed to write state.

## I made the limits inspectable too

The variable view records values and logical aliases. In the mutation case, `next` really refers to the same modeled object as `original`; a later write changes both. Earlier event snapshots remain unchanged. I do not show heap usage or addresses because the engine does not measure them.

This is a bounded behavior interpreter, not a general JavaScript runtime. The sorting model exposes deterministic insertion comparisons rather than pretending to reveal a browser engine's native sort implementation. The displayed snippets describe the rules; the public page does not evaluate arbitrary pasted JavaScript. Presentation cadence is labeled events per second, not server execution speed.

I added checks that compare streamed assertions with every field result under multiple parameter settings, including missing contracts and shallow recursion budgets. Development-only Node VM checks also compare the trusted source fixtures with model outputs. Those checks are local engineering evidence. They are separate from the preserved, controlled Sandbox artifact in the earlier diary.

## What I can investigate next

The useful result is not a larger number of examples. It is a shorter path from a suspicious result to the input, binding, source statement and contract that explain it. I can widen an input range, switch a patch or remove the expected behavior and see the consequences propagate through the same state. An unknown contract should make the answer less certain, even when the program returns normally.

The [interpreter](/source?file=research-interpreter), [input spaces and contracts](/source?file=research-catalog), [event and assertion logic](/source?file=research-computation), and [consistency tests](/source?file=research-computation-tests) are available in Source. The [original controlled Sandbox record](/build-log/2026-10-16-002-isolated-harness) remains unchanged. The complete [Origin](/origin) still explains why I wanted to build REPRO.
