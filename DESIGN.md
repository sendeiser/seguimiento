---
name: Notyx Edu
description: Gamified academic tracking platform
colors:
  primary: "#B044EE"
  neutral-bg: "#F5F7FA"
  neutral-text: "#1C1F26"
  accent-cyan: "#42E1F0"
  success: "#3CCF7A"
  warning: "#E8943D"
  error: "#E84F4F"
  glass-bg: "rgba(255,255,255,0.15)"
  glass-border: "rgba(255,255,255,0.2)"
typography:
  display:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(2rem, 5vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  full: "9999px"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.lg}"
    padding: "0 1.25rem"
    height: "3rem"
  button-secondary:
    backgroundColor: "{colors.glass-bg}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.glass-border}"
  card-default:
    backgroundColor: "{colors.glass-bg}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
  input-default:
    backgroundColor: "rgba(255,255,255,0.1)"
    rounded: "{rounded.lg}"
    height: "3rem"
    border: "1px solid rgba(255,255,255,0.1)"
---

# Design System: Notyx Edu

## 1. Overview

**Creative North Star: "La Consola del Tutor"**

A glass dashboard that feels like commanding a console — transparent layers, glowing accents, and tactile feedback. Every surface is a pane of frosted glass floating over a deep gradient-lit background. The interface is youthful but respected: gamification elements pop with neumorphic depth and animated glow, while data surfaces stay clean, scannable, and professional.

This system explicitly rejects mediocrity — no generic SaaS templates, no flat bootstrap cards, no inconsistent spacing, no clashing visual languages. Glassmorphism is not a trend here; it is the material. The frosted layer is the canvas, the glow is the emphasis, and the neumorphic badges are the reward.

**Key Characteristics:**
- Frosted glass surfaces with 20px backdrop blur
- Deep radial gradient backgrounds (purple + cyan) that shift between light/dark
- Neumorphic gamification elements (XP bars, HP bars, rank badges) for tactile reward feel
- Animated feedback for every state change (grade flash, streak glow, level spring)
- High contrast text on glass surfaces — readable in any lighting

## 2. Colors

A restrained palette anchored by **Púrpura Colegial** (violet accent) and **Cian Consola** (secondary glow), over cool neutrals.

### Primary
- **Púrpura Colegial** (`hsl(262 83% 60%)` / `#B044EE`): The system's voice. Used for primary buttons, active nav items, XP bars, glow effects, and rank highlights. Never more than 30% of any screen — its rarity gives it weight.

### Secondary
- **Cian Consola** (`hsl(185 85% 60%)` / `#42E1F0`): The counterpoint. Used for secondary accents, streak indicators, info badges, and background gradient complements.

### Accent Palette
- **Lima Vital** (`hsl(140 70% 55%)`): HP healthy state, purchase confirmations, badges-success.
- **Naranja Aviso** (`hsl(25 95% 60%)`): HP warning, coin display, reward badges.
- **Rosa Logro** (`hsl(330 90% 65%)`): Achievement badges, rare rank accents.
- **Violeta Maestro** (`hsl(270 70% 65%)`): Top-rank glow (Maestro/Diamante).

### Neutral
- **Hielo Fondo** (`hsl(220 40% 98%)`): Light mode page background.
- **Hielo Superficie** (`hsl(220 25% 96%)`): Card inset backgrounds, secondary surfaces.
- **Carbón Texto** (`hsl(220 10% 12%)`): Primary text, high contrast on glass.
- **Pizarra Tenue** (`hsl(220 8% 35%)`): Secondary text, labels.
- **Neblina** (`hsl(220 10% 55%)`): Muted text, placeholder, dividers.

### Status
- **Verde Reto** (`hsl(140 70% 45%)`): Success states, completions.
- **Ámbar Alerta** (`hsl(35 90% 55%)`): Warnings, medium HP.
- **Rojo Urgente** (`hsl(0 85% 60%)`): Errors, critical HP, absences.

### Named Rules
**The One Accent Rule.** Púrpura Colegial is the only accent that carries system-wide semantic weight. Cyan, lime, orange, pink, and violet are confined to gamification contexts (HP bars, badges, rank glows). Outside gamification, use Púrpura Colegial or neutrals.

**The Glass Overlay Rule.** All colored surfaces are either glass (translucent with blur) or gradient backgrounds. No flat solid-color backgrounds outside of input fields and card inset areas.

## 3. Typography

**Display Font:** Outfit (sans-serif, geometric, warm)
**Body Font:** DM Sans (sans-serif, humanist, readable)
**Gamification Font:** Nunito (rounded, playful — used in XP/HP/rank/badge contexts only)
**Decorative Fonts:** Cinzel, MedievalSharp, Orbitron, Bebas Neue, Roboto Mono (used in specific skin themes and Pokemon card elements)

**Character:** Outfit brings a bold, modern editorial feel to headings — clean geometric shapes with a slight warmth. DM Sans handles body copy with excellent readability at small sizes. Nunito is reserved strictly for gamification stats to signal "this is a game element."

### Hierarchy
- **Display** (Outfit 800, `clamp(2rem, 5vw, 2.5rem)`, 1.2): Page titles, dashboard headings. Heavy weight creates authority.
- **Headline** (Outfit 700, `2rem`, 1.2): Section headers, card titles.
- **Title** (Outfit 700, `1.5rem`, 1.2): Card titles, modal headers.
- **Subtitle** (Outfit 600, `1.25rem`, 1.2): Subsection headers.
- **Body** (DM Sans 400, `1rem`, 1.6): All reading text. Max line length 70ch.
- **Small** (DM Sans 500, `0.875rem`, 1.5): Labels, metadata, nav items.
- **Label** (DM Sans 600, `0.75rem`, 1.4, `0.05em` letter-spacing): Form labels, badge text.

### Named Rules
**The Nunito Boundary Rule.** Nunito is forbidden outside of gamification stats (XP, HP, level, rank, coins, badges). Use Outfit and DM Sans exclusively for all UI text. The font switch signals "this is a game element" without needing a label.

## 4. Elevation

A **layered glass system** with three depth techniques:
- **Glass backdrop blur** (20px) distinguishes surfaces from the background gradient
- **Diffuse shadows** (`0 8px 32px -8px rgb(0 0 0 / 0.12)`) create float without hard edges
- **Neumorphic inset shadows** (`inset 3px 3px 6px rgb(163 177 198 / 0.3)`) add tactile depth to gamification bars
- **Colored glow shadows** (`0 0 20px var(--color-primary)`) mark interactive or rewarded states

### Shadow Vocabulary
- **Glass-sm** (`0 4px 24px -4px rgb(0 0 0 / 0.08)`): Subtle float for secondary surfaces.
- **Glass-md** (`0 8px 32px -8px rgb(0 0 0 / 0.12)`): Default card elevation.
- **Glass-lg** (`0 16px 48px -12px rgb(0 0 0 / 0.15)`): Hovered/interactive cards, modals.
- **Glow** (`0 0 20px hsl(var(--color-primary))`): Active primary elements, XP bar fill.
- **Glow-lg** (`0 0 40px hsl(var(--color-primary))`): High-rank badges (Diamante, Maestro).
- **Neu-subtle** (`inset 3px 3px 6px rgb(163 177 198 / 0.3), inset -3px -3px 6px rgb(255 255 255 / 0.4)`): XP bar background, HP bar background.

### Named Rules
**The Float-Don't-Float Rule.** Every glass surface must have a shadow. No shadow = no glass. The shadow is what sells the frosted material.

## 5. Components

### Buttons
- **Shape:** Bold rounded (1.5rem radius). Large tap target (3rem default height).
- **Primary Glass:** Gradient violet background (`linear-gradient(135deg, hsl(262 83% 60%), hsl(270 70% 60%))`), white text, colored glow shadow. Lifts 2px on hover with intensified glow. Presses down with scale(0.98).
- **Secondary Glass:** Frosted background (`rgba(255,255,255,0.15)`), backdrop-blur(20px), subtle border. Glows primary border on hover.
- **Ghost:** Transparent background, muted text. Reveals frosted bg on hover.
- **Sizes:** sm (2.5rem), md (3rem), lg (3.5rem).
- **Disabled:** Opacity 0.5, no pointer events.
- **Loading:** Text hidden, CSS spinner replaces content.

### Cards
- **Shape:** Extra-bold rounded (2rem radius). Generous padding (1.5rem).
- **Material:** Frosted glass gradient background (`linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))`) with 20px backdrop-blur and translucent border.
- **Interactive variant:** Lifts 4px on hover with intensified shadow and primary border glow.
- **Elevated variant:** Brighter glass gradient with heavier shadow.
- **Inset variant:** Solid secondary background with inner shadow — for data-dense areas where glass blur would impair readability.
- **Sub-elements:** card-header (bottom border), card-title (Outfit 700, 1.25rem), card-description (small, secondary text), card-body, card-footer (top border).

### Inputs / Fields
- **Shape:** Bold rounded (1rem radius). 3rem height.
- **Material:** Frosted glass background (`rgba(255,255,255,0.1)`), subtle border, 10px backdrop-blur.
- **States:** Hover glows primary border tint. Focus gets primary border + 3px `rgba(primary, 0.15)` ring.
- **Icon support:** Absolute-positioned icon inside `.input-wrapper`. Color shifts to primary on focus.
- **Sizes:** sm (2.5rem, 0.875rem), default (3rem, 1rem), lg (3.5rem, 1.125rem).
- **Labels:** DM Sans 600, 0.875rem, secondary color, 0.5rem bottom margin.

### Navigation
- **Shape:** Moderate rounded (0.5rem radius). Compact padding (0.75rem 1rem).
- **Default:** DM Sans 700, 0.875rem, secondary text.
- **Hover:** Frosted background, primary text.
- **Active:** Solid primary background, white text, primary glow shadow.
- **User Avatar:** 2.5rem rounded square with brand gradient background, bold white initial.

### Gamification Components
- **XP Bar:** 0.75rem tall pill with neumorphic inset background. Fill is gradient from primary to accent with glow shadow. Animated width transition (500ms ease).
- **HP Bar:** 0.5rem tall pill. Three color states: healthy (lime), warning (amber), critical (red + pulse animation).
- **Badges:** Inline pill-shaped. Solid background, uppercase label, 0.05em tracking. Variants: default, primary, success, warning, error, xp, coin.
- **Rank Badges:** Large pill (1.5rem radius). Uppercase with heavy tracking. Each of 7 ranks (Hierro → Maestro) has escalating glow intensity. Top 3 ranks (Oro, Platino, Diamante, Maestro) have animated glow.
- **Level Number:** Nunito 800, 2.25rem, primary color.
- **Coin Display:** Nunito 700 with coin emoji prefix.
- **Streak Flame:** Nunito 700 with fire emoji prefix + amber glow.

### Modals
- **Backdrop:** Full-screen overlay, 50% black, 8px backdrop-blur.
- **Container:** Solid bg-primary surface (no glass — readability critical for forms), 3rem radius, 2rem padding, glass-lg shadow, scale-in entrance animation.

### Named Rules
**The No-Flat Rule.** Every component must have at least one layer of depth: glass blur, gradient, shadow, or neumorphic inset. Flat surfaces are forbidden outside of modal content and input fields.

## 6. Do's and Don'ts

### Do:
- **Do** use glassmorphism as the default material for cards, buttons, and navigation.
- **Do** use neumorphic inset shadows for XP bars, HP bars, and progress indicators to signal "physical reward."
- **Do** animate every state change: button hover (lift), card hover (lift + glow), grade save (green/red flash), achievement (slide-in spring).
- **Do** keep high contrast on all text-over-glass combinations. Glass reduces perceived contrast — compensate with font-weight 600+ for body text on glass.
- **Do** use Nunito exclusively for gamification stats to visually separate game elements from UI.
- **Do** stagger entrance animations (50–500ms delays) for lists of cards or students.

### Don't:
- **Don't** use flat, solid-color backgrounds for cards or containers (exception: modal content, input fields).
- **Don't** use generic SaaS templates, bootstrap-like flat cards, or any design that looks "mediocre."
- **Don't** use border-left or border-right greater than 1px as a colored accent stripe on any component.
- **Don't** use gradient text (`background-clip: text`). All text is solid color.
- **Don't** use the hero-metric template (big number, small label, gradient accent, supporting stats).
- **Don't** use identical card grids with icon + heading + text repeated endlessly — vary card layouts.
- **Don't** use bounce or elastic easings. Use cubic-bezier(0.22, 1, 0.36, 1) for entrances and ease-out-quart for state transitions.
- **Don't** animate CSS layout properties (width, height, top, left, padding, margin).
- **Don't** exceed 3 accent colors on any single screen. Gamification components are the only exception.
