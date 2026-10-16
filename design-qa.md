# REPRO author-journal redesign QA

final result: passed

## Target and environment

The selected 1024 × 1536 reference was compared side by side with the final production build at the same CSS viewport and top-of-page state. The existing supplied mascot, DM Sans and IBM Plex Mono are reused. The app remains the existing Next.js project.

Local production URL: `http://127.0.0.1:3001`. Chromium checked 1024 × 1536, 1440 × 1024, 1280 × 800, 390 × 844 and the 760px desktop-navigation boundary. A second 390px context used device pixel ratio 3.

Browser plugin classification: Browser skill not available. The in-app browser rendered the app, but its screenshot capture became unavailable. Repository-installed Playwright supplied exact viewport screenshots, console checks and interaction assertions. An independent Chrome connection with `noDefaults: true` supplied a real hidden-tab test; ordinary automation's focus emulation otherwise keeps pages visible.

## Visual comparison

| Reference element | Final implementation | Result |
| --- | --- | --- |
| White three-line headline, red bug to its right | Same composition, original supplied mascot, two inline story/lab links and author signature | Passed |
| Black field with red right-angle paths and sparse pixels | Canvas stays at the viewport edges; central story remains clear | Passed |
| Narrow chapter number rail and aligned prose | Centered reading width, thin dividers, aligned code and red-rule pull quotes | Passed |
| Unified top navigation | Story, Lab, Source and Build log share one frame; detail routes retain their parent selection | Passed |
| Reduced illustrative copy in the reference | Intentionally replaced by the complete existing ten-chapter text, as explicitly required | Passed; longer document is intentional |
| Mobile adaptation | 140px mascot below the primary links, 16px prose, closable menu and internal code scrolling | Passed |

The initial mascot background seam and mobile illustration overlap were corrected. The initial green UI tints on functional pages were replaced by warm neutral surfaces. No unresolved P0, P1 or P2 findings remain.

## Interaction and runtime checks

| Check | Evidence | Result |
| --- | --- | --- |
| Page identity / meaningful content | Home headline, Lab form, actual Source code, log list and detail render | Passed |
| Original content | All ten exact chapter titles, order, anchors, final signature and illustrative labels; `content/story.md` has no diff | Passed |
| Navigation | Both homepage primary links, four columns, Source query selection and log detail | Passed |
| Mobile menu | Escape returns focus to Menu; outside click and link selection close it | Passed |
| Overflow / typography | All checked widths fit; desktop prose 18px, mobile prose 16px; Source code scrolls inside its block | Passed |
| Actual background movement | Different Canvas images across samples; 43 desktop paints and 24 mobile paints over 2.2 seconds | Passed |
| Motion off and persistence | Frame count and image stop changing; off survives reload | Passed |
| System reduced motion | Overrides saved on, disables the toggle and leaves an unchanged static Canvas | Passed |
| Hidden tab | Actual `document.hidden === true`, state `paused`, frame 26 remains 26 over 800ms; selecting tab resumes painting | Passed |
| Pixel density / pointer behavior | DPR 3 is capped at 1.5; decorative Canvas ignores pointer events | Passed |
| Service and launch truthfulness | Example fills inputs; RUN REPRO stays disabled with unavailable-service text; missing X, CA and BUY remain disabled | Passed |
| Runtime | No application console errors, uncaught errors, blank screens or framework error overlays | Passed |
| Automated verification | Type check, existing 15 tests and production build | Passed |

## Scope and limits

Experiment APIs, service configuration, private access controls, the source whitelist and database schema are unchanged. No live AI or persistence execution is claimed by this redesign's interface tests. External configuration is still required to open the Lab. Safari, Firefox and physical mobile hardware were not exercised.

## Saved evidence

Screenshots are stored outside the source repository in the parent output directory: `repro-redesign-1024.png`, `repro-redesign-1440.png`, `repro-redesign-1280.png`, `repro-redesign-390.png`, `repro-redesign-mobile-menu.png`, and route screenshots. `repro-design-comparison.png` pairs the selected reference with the final 1024px production render. Temporary verification scripts and raw QA output are outside the repository under the task's `work/` directory.
