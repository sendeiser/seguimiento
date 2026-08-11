# Responsive Design

## Mobile-First: Write It Right

Start with base styles for mobile, use `min-width` queries to layer complexity. Desktop-first (`max-width`) means mobile loads unnecessary styles first.

## Breakpoints: Content-Driven

Don't chase device sizes—let content tell you where to break. Start narrow, stretch until design breaks, add breakpoint there. Three breakpoints usually suffice (640, 768, 1024px). Use `clamp()` for fluid values without breakpoints.

## Detect Input Method, Not Just Screen Size

**Screen size doesn't tell you input method.** A laptop with touchscreen, a tablet with keyboard—use pointer and hover queries:

```css
/* Fine pointer (mouse, trackpad) */
@media (pointer: fine) {
  .button { padding: 8px 16px; }
}

/* Coarse pointer (touch, stylus) */
@media (pointer: coarse) {
  .button { padding: 12px 20px; }  /* Larger touch target */
}

/* Device supports hover */
@media (hover: hover) {
  .card:hover { transform: translateY(-2px); }
}

/* Device doesn't support hover (touch) */
@media (hover: none) {
  .card { /* No hover state - use active instead */ }
}
```

**Critical**: Don't rely on hover for functionality. Touch users can't hover.

## Safe Areas: Handle the Notch

Modern phones have notches, rounded corners, and home indicators. Use `env()`:

```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* With fallback */
.footer {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

**Enable viewport-fit** in your meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

## Responsive Images: Get It Right

### srcset with Width Descriptors

```html
<img
  src="hero-800.jpg"
  srcset="
    hero-400.jpg 400w,
    hero-800.jpg 800w,
    hero-1200.jpg 1200w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Hero image"
>
```

**How it works**:
- `srcset` lists available images with their actual widths (`w` descriptors)
- `sizes` tells the browser how wide the image will display
- Browser picks the best file based on viewport width AND device pixel ratio

### Picture Element for Art Direction

When you need different crops/compositions (not just resolutions):

```html
<picture>
  <source media="(min-width: 768px)" srcset="wide.jpg">
  <source media="(max-width: 767px)" srcset="tall.jpg">
  <img src="fallback.jpg" alt="...">
</picture>
```

## Layout Adaptation Patterns

**Navigation**: Three stages—hamburger + drawer on mobile, horizontal compact on tablet, full with labels on desktop. **Tables**: Transform to cards on mobile using `display: block` and `data-label` attributes. **Progressive disclosure**: Use `<details>/<summary>` for content that can collapse on mobile.

## Testing: Don't Trust DevTools Alone

DevTools device emulation is useful for layout but misses:

- Actual touch interactions
- Real CPU/memory constraints
- Network latency patterns
- Font rendering differences
- Browser chrome/keyboard appearances

**Test on at least**: One real iPhone, one real Android, a tablet if relevant. Cheap Android phones reveal performance issues you'll never see on simulators.

---

## Layout, Positioning & Responsiveness Error Defense Matrix

Prevent and fix structural design & responsiveness bugs across all viewports and input modes:

### 1. Flex & Grid Positioning Traps
- **Flex Child Overflow (`min-width: 0`)**: Flex items default to `min-width: auto`, which causes text/images to overflow parents instead of shrinking. Always apply `min-width: 0` (or `min-height: 0` for column flex) on flex children containing truncated text or responsive elements.
- **Alignment Traps**: Avoid `align-items: stretch` on elements with fixed heights or variable badge overlays. Use `align-items: center` or `baseline` for headers/controls to prevent distortion.
- **Grid Auto-fit vs Auto-fill**: Use `minmax(min(100%, 280px), 1fr)` for responsive card grids. Never hardcode absolute pixel minimums without wrapping in `min()` — hardcoded values like `minmax(320px, 1fr)` break on 320px screens with padding.

### 2. Viewport & Scrolling Boundaries
- **Viewport Height Bugs**: Never use `100vh` for full-height layouts on mobile (mobile address bar overlays break it). Use `100dvh` (dynamic viewport height) with `100vh` fallback.
- **Horizontal Scroll Leaks**: Set `overflow-x: hidden` or `max-width: 100%` on outer layout wrappers. Ensure full-width elements use `max-width: 100vw; box-sizing: border-box`.
- **Fixed & Sticky Stacking Contexts**: Avoid arbitrary `z-index: 9999`. Establish explicit CSS stacking layers (`isolation: isolate`) on parent containers so dropdowns, sticky headers, and toasts render above content without overlay conflicts.

### 3. Container Queries & Component-Level Responsiveness
- **Container Queries for Components**: Don't rely solely on global `@media` viewport queries for self-contained components (e.g. user cards, metrics panels, chat widgets). Use `@container` with `container-type: inline-size` so components adapt based on their available slot width, whether in a sidebar or main content area.
- **Fluid Sizing without Breakpoint Spikes**: Use `clamp()` for dynamic type and spacing:
  ```css
  font-size: clamp(1rem, 0.8rem + 1vw, 1.75rem);
  padding: clamp(1rem, 3vw, 2.5rem);
  ```

### 4. Touch Targets & Interaction Boundaries
- **Touch Target Padding**: Interactive controls must measure at least `44px x 44px` on coarse pointers (`@media (pointer: coarse)`).
- **Sticky Footers & Modals**: Bottom bars and action sheets must respect safe areas (`env(safe-area-inset-bottom)`).

---

**Avoid**: Desktop-first design. Device detection instead of feature detection. Separate mobile/desktop codebases. Ignoring tablet and landscape. Assuming all mobile devices are powerful. Flex item overflow (`min-width` missing). Hardcoded px width grids. Fixed `100vh` on mobile. Arbitrary `z-index: 99999`.
