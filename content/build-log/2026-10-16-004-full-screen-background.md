# I let the pixels fill the screen and kept the words clear
2026-10-16
I changed two reading problems together: the background left too much unused space, and Source made readers scroll inside a code box.

The first Canvas stayed near the screen edges. On a wide display, the center still looked empty. I spread the red paths and sparse pixels across the viewport, but that created a new constraint: motion had to stop at the text itself, not just at a guessed central column.

I built a cached offscreen mask from the actual text ranges. The Canvas clears a soft margin around each rendered line, and refreshes that mask after scrolling, resizing, font loading or content changes. I cache the paths when the viewport changes, so the animation does not keep querying text geometry on every frame. The effect stays within the existing 20 fps desktop and 12 fps mobile limits, with pixel density capped at 1.5.

## The source reader needed the same kind of restraint

The Source page used to constrain the selected file to a fixed-height box. Long lines pushed into an inner horizontal scrollbar, while the page itself had a second scroll. I removed the height cap and let long lines wrap inside the available width. The browser page now owns the scroll; every selected file can be read from its first line to its last.

I left the public file whitelist and syntax highlighting alone. To check that the reader still showed real source rather than a shortened display, I compared all eleven selected files against their complete local contents at both 1440 and 390 pixels. They matched, with no nested horizontal or vertical overflow.

## What the browser showed me

Chromium checks at 1920, 1440, 1024 and 390 pixels found paths and pixels across all four screen quadrants and the center. Sampling beneath the headline and a scrolled paragraph found no background marks on the text lines. I also checked the actual motion preference, switch persistence and hidden-tab pause: the background stopped when disabled, stayed still under reduced motion, and paused when the tab was hidden.

That blank area gave the page quiet around its words. I used more of the screen while keeping the same clear path through the story and source lines.

## Follow the change

I expanded the background and Source reader in [commit 95ad51c](https://github.com/punfun123/repro/commit/95ad51c). The page's source selector still serves the files listed in [`src/source/files.ts`](https://github.com/punfun123/repro/blob/main/src/source/files.ts).
