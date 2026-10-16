# Removing the square behind the bug.
2026-10-16
The hero now uses a transparent PNG instead of hiding an opaque background with blending.

The earlier page treatment still left a visible square around the mascot at some sizes. I replaced the hero image with a transparent-background derivative of the supplied mascot and removed the container's background and screen blend. I also stopped clearing the full rectangular image area in the Canvas, so paths can continue through the empty space around the actual character.

The original supplied file is retained. The cutout and its edit prompt are documented in `content/assets/mascot-cutout.md`. Chromium checked the reported 733 × 871 viewport, a 390px phone viewport and 1440px desktop. The image corners are fully transparent, there is no horizontal overflow, navigation still works and no application errors appeared. The story, source reader and experiment API are unchanged.
