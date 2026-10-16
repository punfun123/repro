# A journal around the experiment.
2026-10-16
The story leads the site. The lab, source and development notes keep their real functions and limits.

## Why I changed the frame

The old site put every page inside an editor frame. That made the story read like another source file. I replaced the global explorer, tabs, breadcrumbs and bottom status bar with one navigation and an ordinary footer. The homepage now starts with the author, the supplied red pixel bug and the reason for building REPRO.

I kept all ten English chapters in `content/story.md`, their titles, order and chapter anchors. The shorter copy in the design reference was a layout example. It did not replace the story. A brief author note links this creative origin narrative to the actual implementation notes here.

## A background that stays background

The Canvas draws sparse red right-angle paths and pixels near the edges. It does not report activity, run code or create logs. The center stays clear for reading. Painting is limited to 20 frames per second on desktop and 12 below 760px, with device pixel ratio capped at 1.5.

The footer switch stores an optional local preference. The system's reduced-motion setting takes priority and leaves a static image. Visibility changes stop and restart the animation; cleanup removes its listeners and cancels pending frames.

## What stays functional

The Source page still selects actual whitelisted files. The Lab still loads an example, accepts input and retains its execution and evidence interface. Mobile navigation closes through Escape, a click outside or a selected link. The same column stays selected on detail routes.

This change does not configure a missing provider, open public execution, alter private access checks or change the database schema. Missing official X, contract and purchase information still produces disabled controls.

## Verification

Chromium checked the homepage at 1024, 1280, 1440 and 390px, plus the 760px navigation boundary. Desktop story text is 18px and mobile text is 16px. Ten original chapters, the final signature, illustrative example labels, primary links, Source file selection, log detail navigation and all three mobile menu close actions passed. None of the checked pages had horizontal overflow or application console errors.

Actual Canvas images changed while animation was on. A 2.2-second sample produced 43 desktop paints and 24 mobile paints. Turning motion off stopped painting and survived a reload; the system reduced-motion setting overrode a saved on preference. In an independent Chrome session without automated focus emulation, a hidden tab stayed at frame 26 across an 800ms interval and resumed painting when selected. These are interface checks, not AI or Sandbox experiment results.

The existing fifteen automated tests pass. They continue to use explicitly labeled test doubles for orchestration and access checks. Provider-backed end-to-end verification still requires the missing external configuration.
