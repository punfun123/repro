# I removed the dark square around the mascot
2026-10-16
The screenshot showed a black rectangle around the homepage bug, so I traced its edge back to the source image and fixed the transparency there.

The original mascot is a square PNG with a black background. At first I tried to make it sit over the page with a matching container color and screen blending. At the reported mobile size, the square still showed. The canvas also cleared the mascot's full rectangular bounds, which left an empty patch in the moving background even where there was no character.

I made a transparent-background derivative of the supplied art and kept the original file intact for the other places that still use it. Then I removed the hero container's background and blend mode, and stopped clearing the Canvas across the image rectangle. The transparent pixels now reveal the page naturally around the actual character.

The image corners have zero alpha, and Chromium checked the reported 733 × 871 viewport plus 390px mobile and 1440px desktop. I confirmed the hero had no opaque wrapper or blend workaround, the page did not overflow horizontally, and navigation still worked without application errors. I saved the source image and edit prompt in [`mascot-cutout.md`](https://github.com/punfun123/repro/blob/main/content/assets/mascot-cutout.md).

This was a small visual fix, but it reminded me to solve the problem where it starts. A compositing trick had hidden part of the rectangle; transparency let the background and the character share the same space cleanly.

## Follow the change

The hero now uses the cutout introduced in [commit 45ff1f2](https://github.com/punfun123/repro/commit/45ff1f2). The actual REPRO experiment code and behavior were unchanged.
