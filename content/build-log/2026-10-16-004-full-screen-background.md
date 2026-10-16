# More background. Less scrolling inside scrolling.
2026-10-16
Red pixel paths now fill the screen while clearing actual text lines. Source files open in full with wrapped lines.

## Filling the space

The previous background kept every path close to the edges. On a wide screen, that left a large empty area around the story. I changed the layout of the paths and pixels to cover the full viewport, including the space between the headline, illustration and body.

The background still stays behind the content. A cached Canvas mask clears the actual text lines, with a soft margin around each line. It updates after scrolling, resizing, font loading and content changes, including Source file selection. The mascot also has a clear area so paths do not cross its face or shell. The page's typography and story text are unchanged.

The existing frame limits, pixel density cap, reduced-motion setting, saved switch and hidden-tab pause remain in place. Paths are cached when the viewport changes; text geometry is not read on every idle animation frame.

## Reading the whole source

The Source page no longer clips a file to a fixed-height box. Each selected file expands to its full length, and long lines wrap within the available width. Reading uses the normal page scroll, with no horizontal or vertical scrollbar inside the code block. The public file whitelist, syntax highlighting and actual source contents are unchanged.

## What I checked

Chromium checked the background at 1920, 1440, 1024 and 390px. Visible path and pixel samples appeared in all four quadrants and the center of the Canvas. Sampling the Canvas under the headline and a scrolled story paragraph found no background pixels inside those text lines.

All eleven whitelisted Source files matched their complete local contents at both 1440 and 390px, with no internal overflow. The Lab example still fills the form and live execution stays disabled. The menu still closes with Escape. No application console or runtime errors appeared.

Turning animation off stops drawing and persists across reloads; reduced motion remains static. An independent Chrome session confirmed that a genuinely hidden tab kept the same frame count for 800ms and resumed drawing when selected. The existing fifteen automated tests and type check pass. These checks verify the interface, not a live AI experiment.
