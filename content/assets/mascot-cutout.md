# Hero mascot transparent cutout

- Source: the user-supplied `public/repro-bug.png`, retained unchanged.
- Output: `public/repro-bug-transparent.png` (1254 × 1254 PNG with alpha).
- Tool: built-in imagegen, background-extraction edit, `transparent_background: true`.
- Usage: homepage hero only. The character is composited normally; no opaque wrapper background or screen blend is used. The Canvas no longer clears the hero's rectangular image bounds.
- Verification: all four image corners have alpha 0; 901,317 pixels are fully transparent. Chromium checked the user's 733 × 871 viewport, 390 × 844 and 1440 × 900 with no application errors.

## Exact edit prompt

Use case: background-extraction. This is a precision background removal edit of the supplied REPRO pixel bug brand mascot for a production website. Remove ONLY the connected solid near-black background outside and between the character's silhouette and make those background pixels genuinely transparent (alpha 0). Keep the mascot identical: same composition, position, size relative to the square canvas, orientation facing right, chunky stepped pixel geometry, every red body segment, antenna, leg, cream eyes, black pupils, white glints, pink tongue, thick dark brown/black character outline, red shading and highlights. Preserve the character's dark outline and internal black details as opaque; those belong to the mascot, not the background. Keep original square canvas and padding; do not crop or reposition. Do not redraw, restyle, simplify, sharpen, add glow or shadow, alter colors, add pixels, add text, add a border, or add a checkerboard background. Output a clean transparent PNG cutout with hard pixel-art edges, no black rectangular matte or halo.
