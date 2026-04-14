# VedicHour Design System

## Visual Language: "Calm Precision Astrology"

Three visual modes govern surface treatment:
- **Ritual**: Hero moments, brand surfaces. Serif display type, starfields, mandala textures. Use sparingly.
- **Focus**: Product UI — onboarding, dashboard, forms. Sans-serif, clean, action-oriented.
- **Data**: Reports and dense interpretation. Mono for scores, sans for reading, maximum legibility.

---

## Typography Tokens

| Role | Family | Usage | Tailwind Class |
|------|--------|-------|---------------|
| Display | `font-display` (Cormorant) | Hero headlines only, marketing section titles | `text-display-xl/lg/md` |
| Headline | `font-body` (DM Sans) | Section titles in product surfaces | `text-headline-lg/md/sm` |
| Title | `font-body` | Card titles, subsections | `text-title-lg/md` |
| Body | `font-body` | Default reading text | `text-body-lg/md/sm` |
| Label | `font-body` or `font-mono` | UI labels, meta, tags | `text-label-lg/md/sm` |
| Mono | `font-mono` (JetBrains Mono) | Data, scores, timestamps | `text-mono-lg/md/sm` |

### Rules
- Serif (Cormorant) is **ONLY** for hero/marketing display moments. Never in product/report surfaces.
- Body line length target: 45–75 characters (`max-w-reading` = 65ch).
- Minimum readable text size: `text-body-sm` (13px). Never smaller for critical content.

---

## Color Tokens

### Surfaces (Dark Mode — Default)
| Token | Hex | Usage |
|-------|-----|-------|
| `space` | `#080C18` | Primary background |
| `cosmos` | `#0D1426` | Card / surface background |
| `nebula` | `#141C35` | Elevated surface |
| `horizon` | `#1E2A4A` | Borders |

### Surfaces (Light / Reading Mode)
| Token | Hex | Usage |
|-------|-----|-------|
| `parchment` | `#FAF8F5` | Background |
| `parchment-2` | `#F2EDE6` | Surface |
| `ink` | `#1A1A2E` | Text |

### Accent
| Token | Hex | Usage |
|-------|-----|-------|
| `amber` | `#D4A853` | Primary accent, CTAs |
| `amber-light` | `#E8C97A` | Hover states |
| `amber-dark` | `#B8923E` | Pressed states |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#3B9B6E` | Favorable, good scores |
| `caution` | `#C75B3A` | Avoid, warnings, low scores |
| `guidance` | `#D4A853` | Primary guidance, recommendations |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `star` | `#E8EAF0` | Primary text |
| `dust` | `#8892A4` | Secondary text, descriptions |

---

## Spacing & Layout

- Nav height: `var(--nav-height)` = 4rem
- Page max-width: `max-w-6xl` (marketing), `max-w-4xl` (product)
- Section padding: `py-24 md:py-28`
- Card padding: `p-6 md:p-8`

---

## Radii

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-card` | 0.5rem | Cards, panels |
| `rounded-button` | 0.375rem | Buttons, inputs |
| `rounded-badge` | 0.25rem | Badges, tags |
| `rounded-pill` | 9999px | Pills, progress bars |

---

## Shadows / Elevation

| Token | Usage |
|-------|-------|
| `shadow-card` | Default card shadow |
| `shadow-card-hover` | Hovered card |
| `shadow-elevated` | Modals, dropdowns |
| `shadow-glow-amber` | Featured elements |
| `shadow-glow-success` | Positive highlights |
| `shadow-glow-caution` | Warning highlights |

---

## Component Patterns

### Buttons
- Primary: `.btn-primary` — amber bg, space text
- Secondary: `.btn-secondary` — outline, border-horizon
- Min height: 44px (touch target)

### Cards
- `.card` — static card
- `.card-interactive` — hover border + shadow

### Section Headers
```
.section-eyebrow — mono, uppercase, amber
.section-title — body font, semibold
.section-subtitle — muted description
```

### Score Colors
Scores use consistent semantic mapping:
- ≥ 65: `text-success` / green
- ≥ 45: `text-amber` / amber
- < 45: `text-caution` / red-orange

---

## Motion

- Default transition: `duration-250`
- Smooth: `ease-out-expo` (cubic-bezier 0.22, 1, 0.36, 1)
- Starfields, mandalas: **only** in hero/background. Never behind dense data.
- All animations respect `prefers-reduced-motion: reduce`.

---

## Accessibility Checklist

- [x] `prefers-reduced-motion` support in globals.css
- [x] Focus-visible outlines on all interactive elements
- [x] Min 44px touch targets on mobile
- [x] No text smaller than 11px for critical content
- [x] Semantic HTML (nav, main, section, role attributes)
- [x] ARIA labels on icon-only buttons
- [x] Color not sole indicator of meaning (labels accompany scores)
