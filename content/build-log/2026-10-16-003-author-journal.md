# I moved the story out of the editor frame
2026-10-16
I changed the site shell so REPRO's story, experiment and source code each have room to do their own job.

Every route used to sit inside an editor-style frame. That made the homepage feel like a file in a project tree, and it gave the shell more attention than the experiment. I removed the global Explorer, editor tabs, breadcrumbs and bottom status strip, then gave the site one shared navigation for Story, Lab, Source and Build Log.

I kept the ten chapter Origin Story in its own place and left its full text intact. The homepage now introduces the author and points to the Lab; the Source page keeps its own file selector; the Build Log holds implementation decisions and evidence. That separation lets a reader move from the idea to the actual mechanism without making the interface pretend to be an IDE.

## The background should never look like activity

I added a quiet Canvas with red right-angle paths and scattered pixels. At first I placed most of it near the edges. On a wide screen, that left the story floating inside too much empty black, so I later let the paths cover the viewport and taught the Canvas to clear a small margin around real text lines.

I kept the effect deliberately separate from REPRO's execution state. It does not create logs, results or status changes. It does not follow the pointer. The frame rate is capped, a hidden tab pauses drawing, and the reduced-motion setting leaves a static background. The author's motion toggle only controls this decoration.

## What I checked

Chromium checked the redesigned story at 1024, 1280, 1440 and 390 pixels, including the mobile menu's Escape, outside-click and selected-link close behavior at the 760-pixel boundary. The ten chapters, their anchors, the signature, the story-to-log link and the Lab route remained available without horizontal overflow. The Lab still reports missing services truthfully.

The Canvas changed in real frames, then stopped when I turned its switch off. It also stayed static under reduced motion, and an independent browser tab check confirmed that a hidden page paused and resumed when visible again. Those results verify the background behavior only; they say nothing about a live AI experiment.

I kept the visual language quiet around the story and made sure the Canvas never reports execution. That boundary shaped both the simpler shell and the background's strict limits.

## Follow the change

I rebuilt the shared frame and story layout in [commit 39f6cf0](https://github.com/punfun123/repro/commit/39f6cf0). The full Origin Story remains in [`content/story.md`](https://github.com/punfun123/repro/blob/main/content/story.md); this note is about how I presented it.
