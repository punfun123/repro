# REPRO author-journal redesign QA

final result: passed

## Target and environment

The selected 1024 × 1536 reference established the author-journal frame. The subsequent user screenshots explicitly requested full-screen background coverage and complete Source files without nested scrolling; those requests supersede the reference's edge-only background and the earlier code height limit. The supplied mascot, DM Sans, IBM Plex Mono and existing Next.js project are retained.

Local production URL: `http://127.0.0.1:3001`. The initial frame was checked at 1024, 1280, 1440 and 390px, plus the 760px navigation boundary. Follow-up background checks use 1920 × 1080, 1440 × 900, 1024 × 900 and 390 × 844. All eleven source files are checked at both 1440 and 390px. A second 390px context uses device pixel ratio 3.

Browser plugin classification: Browser skill not available. The in-app browser rendered the app, but its screenshot capture became unavailable. Repository-installed Playwright supplied exact viewport screenshots, console checks and interaction assertions. An independent Chrome connection with `noDefaults: true` supplied a real hidden-tab test; ordinary automation's focus emulation otherwise keeps pages visible.

## Visual comparison

| Reference element | Final implementation | Result |
| --- | --- | --- |
| White three-line headline, red bug to its right | Same composition, original supplied mascot, two inline story/lab links and author signature | Passed |
| Full-screen background requested in follow-up | Paths and pixels cover all four quadrants and the center; a cached mask clears actual text lines and the mascot | Passed |
| Narrow chapter number rail and aligned prose | Centered reading width, thin dividers, aligned code and red-rule pull quotes | Passed |
| Unified top navigation | Story, Lab, Source and Build log share one frame; detail routes retain their parent selection | Passed |
| Reduced illustrative copy in the reference | Intentionally replaced by the complete existing ten-chapter text, as explicitly required | Passed; longer document is intentional |
| Mobile adaptation | 140px mascot below primary links, 16px prose, closable menu and wrapped Source code | Passed |

The mascot background seam and overlapping paths were corrected by combining a local blending surface with a soft clearing in the Canvas. No font sizes, colors, weights or story content changed in the follow-up. No unresolved P0, P1 or P2 findings remain.

## Interaction and runtime checks

| Check | Evidence | Result |
| --- | --- | --- |
| Page identity / meaningful content | Home headline, Lab form, actual Source code, log list and detail render | Passed |
| Original content | All ten exact chapter titles, order, anchors, final signature and illustrative labels; `content/story.md` has no diff | Passed |
| Navigation | Both homepage primary links, four columns, Source query selection and log detail | Passed |
| Mobile menu | Escape returns focus to Menu; outside click and link selection close it | Passed |
| Overflow / typography | All checked widths fit; desktop prose 18px, mobile prose 16px; all eleven Source files expand fully, wrap and match complete file contents without internal overflow | Passed |
| Actual background movement | Different Canvas images across samples; desktop and mobile frame counts remain below their 20 / 12 fps limits | Passed |
| Text protection | Canvas alpha is zero inside sampled headline and scrolled paragraph lines; background pixels remain in every quadrant and the center | Passed |
| Motion off and persistence | Frame count and image stop changing; off survives reload | Passed |
| System reduced motion | Overrides saved on, disables the toggle and leaves an unchanged static Canvas | Passed |
| Hidden tab | Actual `document.hidden === true`, state `paused`, frame count unchanged over 800ms; selecting tab resumes painting | Passed |
| Pixel density / pointer behavior | DPR 3 is capped at 1.5; decorative Canvas ignores pointer events | Passed |
| Service and launch truthfulness | Example fills inputs; RUN REPRO stays disabled with unavailable-service text; missing X, CA and BUY remain disabled | Passed |
| Runtime | No application console errors, uncaught errors, blank screens or framework error overlays | Passed |
| Automated verification | Type check, existing 15 tests and production build | Passed |

## Scope and limits

Experiment APIs, service configuration, private access controls, the source whitelist and database schema are unchanged. No live AI or persistence execution is claimed by this redesign's interface tests. External configuration is still required to open the Lab. Safari, Firefox and physical mobile hardware were not exercised.

## Saved evidence

The initial reference comparison remains in `repro-design-comparison.png`. Follow-up screenshots are saved outside the source repository in the parent output directory: `repro-full-home-1920.png`, `repro-full-home-1440.png`, `repro-full-home-1024.png`, `repro-full-home-390.png`, `repro-full-source-1440.png`, `repro-full-source-390.png` and `repro-full-source-complete.png`. Live verification uses the `repro-full-live-` prefix. Temporary verification scripts stay outside the repository under the task's `work/` directory.
