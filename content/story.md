# REPRO

## I GOT TIRED OF AI TELLING ME MY CODE WAS FIXED.

*Why I'm building an AI that has to prove its answers.*

### 01 — IT SAID "FIXED."

The frustration I kept coming back to was simple.

I'd spend hours staring at a piece of code that should work.

Everything would look right to me.

The logic made sense. The functions were there. I couldn't immediately see what was broken.

But somewhere, something was wrong.

So I'd do what had become an ordinary part of my workflow.

I'd ask AI.

I'd paste the error message, explain what I expected to happen, and wait.

A few seconds later, I'd have an answer.

The AI would explain the problem with impressive confidence. It would identify a likely cause, rewrite a few lines, and hand me a solution.

Sometimes it would even say:

"The issue has been fixed."

That sentence always bothered me.

Because the AI hadn't actually fixed anything.

It had suggested a change.

It hadn't run the program.

It hadn't reproduced the original error.

It hadn't checked whether the proposed modification worked.

It had simply generated an answer that looked like a solution.

And somehow, that had become normal.

I kept thinking about the difference between those two things.

**Writing a fix and proving a fix are not the same job.**

I realized how easy it had become for me to treat them as if they were.

### 02 — THE PROBLEM WASN'T THE CODE.

The more I thought about it, the stranger the situation became.

We now have AI systems capable of writing entire applications, explaining complicated algorithms, navigating repositories, and producing thousands of lines of code.

But generating code is only one part of software engineering.

I don't know that my code works just because it looks reasonable.

I have to execute it.

I have to observe what it does.

I have to compare the result with what I intended to happen.

And when something breaks, I try to make it break again.

Because a bug that cannot be reproduced is difficult to understand.

And a fix that hasn't been tested is still a hypothesis.

That is the part I felt was missing.

I was asking AI to help me engineer software. I wanted to hold its answers to the same standard I would hold my own work to.

A model could explain an error beautifully while misunderstanding its actual cause.

It could suggest a change that removed the visible exception while introducing a quieter, more dangerous bug.

It could make a failing test pass by changing the test instead of fixing the program.

And the final answer could still sound completely convincing.

That's when I realized something.

The problem wasn't that AI couldn't write enough code.

**The problem was that it could sound certain without producing evidence.**

I didn't want another AI that was better at saying "I fixed it."

I wanted one that had to demonstrate what it had done.

### 03 — A DIFFERENT QUESTION.

Most coding assistants start with a question like:

"How do I fix this?"

I wanted to start somewhere else.

**"Can you make it fail?"**

That might sound backward.

Why would anyone build an AI whose first objective is to break software?

Because I can learn something concrete from a failure I can reproduce.

It turns a vague complaint into an observable event.

Here's the simplest example I can use to explain what I mean.

```javascript
const user = undefined;

console.log(user.id);
```

I can suspect what's wrong here without asking a model.

But suspicion isn't the interesting part.

What I want to see is what happens when the code actually runs.

Does the program throw an exception?

Which line fails?

What does the runtime actually report?

Can the failure be triggered consistently?

Now I imagine that same problem buried inside a codebase I don't know yet.

The AI might propose several different explanations.

Instead of trusting its first guess, I wanted it to test those explanations.

Try to reproduce the failure.

Reduce the problem to the smallest useful example.

Save the error.

Understand why the error happens.

Only then attempt a fix.

That one change in the order of operations became the foundation for everything.

I don't want to begin by defending the AI's first answer.

**I want to begin by finding out what is actually wrong.**

### 04 — I CALLED IT REPRO.

REPRO comes from one of the most useful concepts in debugging:

A reproducible bug.

If someone tells me their software is broken, the first useful question I can ask is:

"Can you show me how to reproduce it?"

Not how to describe it.

Not how to guess at it.

How to make the failure happen again.

I wanted to turn that simple engineering instinct into an AI system.

Not a chatbot with a debugging personality.

Not a terminal animation pretending to execute code.

Not another model that produces a confident explanation and leaves the difficult part to the user.

A real experimental process.

The idea I wanted to build into REPRO is simple.

Give it something broken.

Let it inspect the problem.

Let it attempt to reproduce the failure in an isolated environment.

Let it propose a modification.

Then make it run the relevant tests.

And make the result visible.

I reduced that process to four words:

**ANALYZE. REPRODUCE. PATCH. VERIFY.**

Each word represents an action.

Not a marketing claim.

Not a decorative feature.

An actual step that must produce observable output.

If the AI cannot reproduce the original error, it should say so.

If the proposed patch fails, it should say so.

If a test passes, it should show what was tested.

And if there isn't enough evidence to reach a conclusion, the result should remain unverified.

I wanted uncertainty to be part of the product, not something hidden behind a polished response.

### 05 — FAILURE IS A RESULT.

This became one of the most important principles of REPRO.

A failed experiment is not necessarily a failed product.

Sometimes a failed attempt gives me exactly the information I need.

Suppose I submit an error to an AI.

It analyzes the problem, writes a patch, runs the test, and discovers that the same exception still occurs.

A conventional assistant might simply try another answer.

REPRO should preserve what happened.

The proposed modification failed.

The test still reproduces the original issue.

That attempt did not solve the problem.

I want those facts to stay in the record.

There's another case I keep thinking about.

An AI suggests replacing a dangerous property access with optional chaining.

The exception disappears.

The test turns green.

But did the program actually become correct?

Maybe.

Or maybe the code was supposed to reject missing user data, and the change merely concealed a deeper problem.

This is why I don't want REPRO to confuse the absence of an exception with proof of correctness.

A successful test is evidence about a specific behavior under specific conditions.

It is not proof that every possible problem in the software has disappeared.

That distinction is essential.

I would rather have a system that admits its limits than one that exaggerates its abilities.

**A visible failure teaches you something.**

**A hidden failure teaches you nothing.**

### 06 — LET THE CODE SPEAK.

There was another decision that felt important from the beginning.

If REPRO is going to make claims about software, those claims should be inspectable.

I don't want the website to be filled with invented technical statistics.

I don't want a fake terminal displaying random commands.

I don't want thousands of supposed AI agents running imaginary experiments.

I want the important parts of the system to be understandable.

What code was submitted?

What did the AI think was wrong?

What test did it generate?

What actually happened when the original code ran?

What changed in the proposed patch?

What happened when the modified code was tested?

I want every experiment to leave me with real answers to those questions.

A result should be more than a green checkmark.

It should be a record.

Something a developer can read.

Something another person can challenge.

Something that can be tested again.

And I want the project's own implementation to follow the same philosophy.

The important source files should be available in a public repository.

Changes should have real commits.

Development notes should describe actual decisions.

Tests should be executable.

The source code should explain how REPRO works, not merely create the appearance of technical sophistication.

Because if I'm building an AI that demands evidence, I should be willing to provide evidence for the AI itself.

**The code isn't decoration.**

**The code is part of the story.**

### 07 — A LAB, NOT A PROMISE.

I started thinking of REPRO less like a traditional application and more like a small, public software laboratory.

A place where broken code can be examined.

Where an AI can make mistakes.

Where tests can fail.

Where experiments leave evidence behind.

I don't want to ask you to trust a claim about how intelligent the system is.

I want to give you something you can try for yourself.

Paste a small JavaScript bug.

Describe what went wrong.

Start an experiment.

Watch the system attempt to reproduce the error.

Inspect the proposed correction.

Read the verification output.

I think that interaction explains what I'm trying to build better than a thousand words about AI.

But I also wanted the limits to be visible.

REPRO should not claim to understand every programming language.

It should not pretend that every bug has a simple solution.

It should not silently change tests until they pass.

And it should never turn a failed experiment into a successful-looking animation.

Sometimes the correct result is:

UNVERIFIED.

Sometimes it is:

REPRODUCED — PATCH FAILED.

Sometimes a targeted test passes, but the broader behavior remains uncertain.

These aren't embarrassing outcomes.

They're honest ones.

And honesty is a technical feature I want this system to have.

### 08 — WHY MAKE IT PUBLIC?

I could build a debugging tool and keep everything behind a simple interface.

Users would submit code.

A model would return an answer.

That would be another useful application.

But it wouldn't tell the entire story.

I want REPRO to develop in public.

Not because public code automatically makes software trustworthy.

It doesn't.

But because public implementation makes independent examination possible.

If you open my repository, I want you to be able to see how an experiment is executed.

I want you to be able to find the code responsible for verification.

And I want you to be able to inspect exactly what I've allowed the program to call a successful test.

And when I make a mistake in the implementation, I want that mistake to be something I can explain and correct.

I don't want to build a mythology around an AI that never fails.

I want to build a system whose failures can be investigated.

The public development log is part of that idea.

In each meaningful update, I want to explain what I changed and why.

When a test fails, the result should not disappear just because it makes the system look less impressive.

When the architecture changes, the explanation should be connected to real code.

**I want the development process to be visible, not just the final interface.**

### 09 — AND WHAT ABOUT $REPRO?

At some point, there is an obvious question.

Why attach a token to an AI debugging experiment?

My answer is not that a token makes the AI smarter.

It doesn't.

A token cannot reproduce a bug.

It cannot execute JavaScript.

It cannot validate a patch.

Those capabilities have to exist in the software itself.

I see $REPRO as the community identity around this experiment.

A way to recognize and follow a project built around a simple engineering idea:

Claims should come with evidence.

I don't want to pretend that holding a token magically improves the accuracy of an AI model.

I don't want to promise that a token will increase in value because the software exists.

If there are ever token-linked product features, they should be real, implemented, documented, and independently understandable.

Until then, the software must stand on its own.

I want this project to make sense to you even if you never buy the token.

Because if the only interesting part of REPRO were its token, then I wouldn't have built anything worth talking about.

### 10 — MAKE IT BREAK FIRST.

I don't know how many bugs REPRO will eventually solve.

I don't know which experiments will become interesting.

And I don't know how many times its own implementation will need to change.

That's part of the reason I want to keep working on it.

I'm not expecting to build an AI that never gets anything wrong.

I'm trying to build one that is less willing to confuse an answer with evidence.

Something that tests its assumptions.

Something that exposes its mistakes.

Something that makes uncertainty visible.

Something that treats a failed test as information rather than an inconvenience.

That is the principle I want to keep coming back to.

Before I call a problem fixed, I want to make it happen.

Then I want to show what changed.

Then I want to test again.

And let the result speak for itself.

**MAKE IT BREAK FIRST.**

— REPRO Developer
