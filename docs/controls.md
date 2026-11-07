# Shared interaction design

The user-supplied `a7388975b8643d624976409f693c592e.mov` defines the geometry and
motion: a rectangular label, a detached icon circle, and a hover/focus transition
where the background bridges the gap and the circle becomes an inset square.
At the user's request, the video's orange accent is replaced by the existing
Nivect forest/sage/cream theme. Native HTML interaction semantics remain intact.

- Label surface: shared `--green` (`#2f4935`); label text: shared `--cream` (`#f1f0e6`).
- Accent: sage `#b6c69d`; accent icons/checks: deep forest `#263c2b`.
- Keyboard/input focus: olive `#637a50`; the dark hero uses a light sage focus ring.
- Semantic token names (`surface`, `accent`, `on-accent`, `text`, `focus`) keep
  every control consistent without tying the implementation to a specific hue.
- Main CTA height 52px (48px on narrow screens); workspace controls use compact sizes.
- The 500ms transition uses `cubic-bezier(.22,1,.36,1)` and changes no layout dimensions.
- Keyboard focus has the same visual transition plus a visible outline.
- Disabled buttons stay native disabled and do not animate. Reduced motion removes transitions.
- Links, selects, checkboxes, range thumbs and decorative card arrows share the same geometry/palette.

Use `frontend/src/Action.jsx` for every new visible action. An existing Lucide
icon child becomes the sage accent control; otherwise a northeast arrow is supplied.
Icon-only buttons must carry an accessible `aria-label`. Submit buttons explicitly
set `type="submit"`; other buttons default to `type="button"`. Native navigation
uses `as="a"` and `href`. `SelectControl` wraps a real select and forwards its
label, controlled value, options and change handler.

The `bare` escape hatch is reserved for brand navigation and invisible modal/menu
backdrops. It does not apply a CTA treatment to those structural targets.
`actions.css` loads after the base layout stylesheet. Caption styles are scoped to
caption spans so they cannot recolor a control's internal label or icon.

Chromium coverage checks the circle/square states, stable bounding boxes, keyboard
activation, native form submission, select filtering, checkbox mouse/keyboard
state, range keyboard changes, mobile navigation and disabled camera actions.
