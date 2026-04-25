# Web Design Tokens Reference

**Last Updated:** 2026-04-25
**Version:** Neo Brutalism 2.1 (generated tokens from Phase 3 M1-R sub-phase 3-R2)
**Single source of truth:** [`specs/ui-ux/tokens.json`](../ui-ux/tokens.json) (validated by [`tokens.schema.json`](../ui-ux/tokens.schema.json))
**Canonical registry:** [`specs/ui-ux/design-tokens.md`](../ui-ux/design-tokens.md)
**Generated consumer:** `fe/web/src/app/generated/tokens.css` (emitted by `scripts/build-tokens.ts` — never hand-edit)
**Imported by:** `fe/web/src/app/globals.css` via `@import './generated/tokens.css'` at the top, before Tailwind layers
**Related ADRs:** [ADR-036](../architecture/decisions/ADR-036-design-tokens-single-source.md) (single source), [ADR-037](../architecture/decisions/ADR-037-web-pwa.md) (PWA)

> **What this file is.** A **web-platform lens** on the generated token shape — shows how each Layer-1 token from `tokens.json` surfaces inside Tailwind config, CSS custom properties, shadcn/ui primitives, and Next.js server/client components. Values here MUST match `tokens.json`; drift is caught by CI (`npm run tokens:verify`).
>
> **What this file is NOT.** The source of truth. To change a value, edit `tokens.json`, run `npm run tokens:build`, commit the regenerated file. Hand-edits to `globals.css` variables are blocked by an ESLint rule (`no-inline-hex-colors`, `exclude: ['src/app/generated/**']`) from Phase 3 M1-R sub-phase 3-R1 onward.

---

## How the tokens reach the browser

```
specs/ui-ux/tokens.json
       │
       ▼ scripts/build-tokens.ts --target web
       │
fe/web/src/app/generated/tokens.css            ← git-tracked, CI-verified
       │
       ▼ @import
       │
fe/web/src/app/globals.css                     ← handwritten shell: @tailwind layers, global resets
       │
       ▼ Next.js CSS pipeline
       │
Tailwind reads CSS vars via tailwind.config.ts (theme.extend.colors['nb-*'] = 'var(--color-nb-*)')
       │
       ▼ build
       │
Generated utility classes: shadow-nb-sm, bg-nb-canvas, text-nb-h1, etc.
```

All layers are reachable from both Server Components (they compile to static CSS) and Client Components (runtime `className` composition). No runtime JS dependency on tokens.

---

## Web-Specific Emitter Rules

### Shadow emission

Each `shadow.*` token emits a CSS custom property + a paired Tailwind utility:

```css
/* fe/web/src/app/generated/tokens.css */
:root {
  --shadow-nb-xs:   2px 2px 0 var(--color-nb-border);
  --shadow-nb-sm:   4px 4px 0 var(--color-nb-border);
  --shadow-nb-md:   6px 6px 0 var(--color-nb-border);
  --shadow-nb-lg:   8px 8px 0 var(--color-nb-border);
  --shadow-nb-xl:  10px 10px 0 var(--color-nb-border);
  --shadow-nb-hover:  8px 8px 0 var(--color-nb-border);
  --shadow-nb-active: 2px 2px 0 var(--color-nb-border);
  --shadow-nb-none:  0 0 0 transparent;
}
```

Tailwind extension (`tailwind.config.ts`) wires these up:

```ts
export default {
  theme: {
    extend: {
      boxShadow: {
        'nb-xs':    'var(--shadow-nb-xs)',
        'nb-sm':    'var(--shadow-nb-sm)',
        'nb-md':    'var(--shadow-nb-md)',
        'nb-lg':    'var(--shadow-nb-lg)',
        'nb-xl':    'var(--shadow-nb-xl)',
        'nb-hover': 'var(--shadow-nb-hover)',
        'nb-active':'var(--shadow-nb-active)',
      },
    },
  },
};
```

Usage: `className="shadow-nb-sm hover:shadow-nb-hover active:shadow-nb-active"`. The default Tailwind `shadow-sm / shadow-md / shadow-lg` utilities are **forbidden** on Phase 3 surfaces (ESLint rule `no-tailwind-shadow-classes-with-blur` — they carry blur that breaks the NB stamp).

### Press animation — Tailwind composition

Every interactive NB primitive composes these utilities:

```tsx
const nbPressable =
  'shadow-nb-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-nb-hover ' +
  'active:translate-x-0.5 active:translate-y-0.5 active:shadow-nb-active ' +
  'transition-all duration-100 ease-out';
```

Motion timings (`100 / 150 / 200 / 250 ms`) are emitted as CSS vars too:

```css
:root {
  --motion-nb-press:  100ms;
  --motion-nb-hover:  150ms;
  --motion-nb-enter:  200ms;
  --motion-nb-exit:   250ms;
}
```

Use `transition-all duration-[var(--motion-nb-press)]` when the fixed 100/150/200/250 shortcuts don't fit.

### Focus ring — `.nb-focus` utility

Generated helper class:

```css
/* in generated/tokens.css */
.nb-focus:focus-visible {
  outline: 3px solid var(--color-nb-primary);
  outline-offset: 2px;
}
```

Every interactive component (Button, TextInput, IconButton, Link) appends `nb-focus`. Applies in keyboard nav only (`:focus-visible`), never on mouse click.

### Color emission — CSS custom properties

```css
:root {
  --color-nb-primary:         #7FBC8C;
  --color-nb-primary-hover:   #6BA87A;
  --color-nb-primary-active:  #5A9468;
  --color-nb-secondary:       #8B7355;
  --color-nb-secondary-hover: #725E45;

  --color-nb-success:         #7FBC8C;
  --color-nb-success-light:   #BAFCA2;
  --color-nb-success-dark:    #15803D;
  --color-nb-warning:         #E3A018;
  --color-nb-warning-light:   #FFDB58;
  --color-nb-danger:          #FF6B6B;
  --color-nb-danger-light:    #FFA07A;
  --color-nb-danger-dark:     #991B1B;
  --color-nb-info:            #69D2E7;
  --color-nb-info-light:      #A7DBD8;

  --status-active:   #15803D;  --status-active-bg:  #DCFCE7;
  --status-idle:     #D97706;  --status-idle-bg:    #FEF3C7;
  --status-outside:  #9333EA;  --status-outside-bg: #F3E8FF;
  --status-missing:  #DC2626;  --status-missing-bg: #FEE2E2;
  --status-offline:  #6B7280;  --status-offline-bg: #F3F4F6;

  --plant-ok:        #15803D;
  --plant-due:       #D97706;
  --plant-overdue:   #DC2626;

  --req-submitted:    #6B7280;
  --req-under-review: #2563EB;
  --req-approved:     #15803D;
  --req-rejected:     #DC2626;
  --req-converted:    #7C3AED;
  --req-in-progress:  #D97706;
  --req-done:         #16A34A;
  --req-cancelled:    #9CA3AF;

  --color-nb-canvas:       #F5F0EB;  /* page background */
  --color-nb-surface:      #FFFFFF;  /* card fill */
  --color-nb-accent-yellow:#FDFD96;
  --color-nb-accent-mint:  #DAF5F0;
  --color-nb-accent-green: #B5D2AD;
  --color-nb-accent-pink:  #FCDFFF;
  --color-nb-overlay:      rgba(0,0,0,0.5);

  --color-nb-border:  #1C1917;
  --color-nb-black:   #1C1917;
  --color-nb-white:   #FFFFFF;
  --color-nb-navy:    #1A4D2E;

  --color-nb-sidebar-bg:     #1A4D2E;
  --color-nb-sidebar-hover:  #2D5233;
  --color-nb-sidebar-active: #0F3520;
  --color-nb-sidebar-fg:     #FFFFFF;
  --color-nb-sidebar-border: #2D5233;
}
```

Tailwind exposes each of these as a utility family: `bg-nb-canvas`, `bg-nb-surface`, `bg-nb-primary`, `text-nb-border`, `border-nb-border`, `text-status-active`, `bg-status-active-bg`, `bg-plant-due`, etc.

### Radius & border

```css
:root {
  --radius-nb-none: 0;
  --radius-nb-sm:   4px;
  --radius-nb-base: 6px;
  --radius-nb-md:   8px;
  --radius-nb-lg:   12px;
  --radius-nb-full: 9999px;

  --bw-nb-thin:  1px;
  --bw-nb-base:  2px;
  --bw-nb-thick: 3px;
  --bw-nb-extra: 4px;
}
```

Tailwind keys: `rounded-nb-sm`, `rounded-nb-base`, …, `rounded-nb-full`; `border-nb-thin`, `border-nb-base`, `border-nb-thick`, `border-nb-extra`.

### Spacing

```css
:root {
  --space-nb-xs:  4px;
  --space-nb-sm:  8px;
  --space-nb-md:  16px;
  --space-nb-lg:  24px;
  --space-nb-xl:  32px;
  --space-nb-2xl: 48px;
  --space-nb-3xl: 64px;

  --space-nb-touch-web:    44px; /* pointer contexts */
  --space-nb-touch-mobile: 48px; /* touch contexts (mobile web) */
}
```

Web prefers the 4/8/16/24/32 scale; the 48/64 values are for section-level vertical rhythm.

### Typography

Fonts load once at the root layout via `next/font/google`:

```tsx
// fe/web/src/app/layout.tsx
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';

const displayFont = Space_Grotesk({ subsets: ['latin', 'latin-ext'], weight: ['600','700','800'], variable: '--font-display' });
const bodyFont    = Inter(         { subsets: ['latin', 'latin-ext'], weight: ['400','500','600','700'], variable: '--font-body' });
const monoFont    = JetBrains_Mono({ subsets: ['latin'],             weight: ['400','500','700'], variable: '--font-mono' });

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      <body className="bg-nb-canvas text-nb-border">{children}</body>
    </html>
  );
}
```

Type scale emits as utility classes:

| Token            | Tailwind class     | CSS effect |
|------------------|--------------------|---|
| `type.display-xl` | `text-nb-display-xl` | `font-display font-extrabold text-[56px] leading-[1.05]` |
| `type.display`    | `text-nb-display`    | 40 / 1.1 / extrabold |
| `type.h1`         | `text-nb-h1`         | 32 / 1.15 / bold |
| `type.h2`         | `text-nb-h2`         | 24 / 1.2 / bold |
| `type.h3`         | `text-nb-h3`         | 20 / 1.3 / semibold |
| `type.body-lg`    | `text-nb-body-lg`    | 18 / 1.55 / medium |
| `type.body`       | `text-nb-body`       | 16 / 1.5 / regular |
| `type.body-sm`    | `text-nb-body-sm`    | 14 / 1.45 / regular |
| `type.caption`    | `text-nb-caption`    | 12 / 1.4 / semibold, **uppercase** via matching utility |
| `type.mono-sm`    | `text-nb-mono-sm`    | 12 / 1.4 / mono / medium |

**Never** use Tailwind's raw `text-xl`, `text-2xl`, etc. on Phase 3 surfaces — they don't map to the semantic scale. ESLint rule `prefer-nb-type-utility` flags them.

---

## PWA Tokens (ADR-037)

The manifest and related chrome consume tokens:

| PWA surface | Token |
|-------------|-------|
| `manifest.webmanifest` `background_color` | `bg.canvas` → `#F5F0EB` |
| `manifest.webmanifest` `theme_color` (Android status bar) | `sidebar.bg` → `#1A4D2E` |
| Install banner fill | `bg.accent.yellow` → `#FDFD96` |
| Install banner border / shadow | `border.color` + `shadow.sm` |
| Offline banner fill | `bg.accent.yellow` with `border.width.thin` bottom border |
| PWA icon glyph | `neutral.white` on `color.primary` (`#7FBC8C`) with `border.width.extra` border and `shadow.sm` offset |

See [design-tokens.md §PWA Requirements](../ui-ux/design-tokens.md) for the manifest JSON, icon sizes, service-worker caching strategy, and push-notification types.

---

## Responsive Tokens (Web Only)

Breakpoints are **web-only** and therefore kept out of `tokens.json`. They live at the generator layer:

```ts
// scripts/build-tokens.ts — web only
export const breakpoints = {
  mobile:  '0px',
  tablet:  '768px',
  desktop: '1280px',
} as const;
```

Tailwind consumes them as `screens.tablet` / `screens.desktop` (mobile is the default; no explicit breakpoint). See [responsive-design.md](../ui-ux/responsive-design.md) for per-page layout rules.

---

## Tailwind config integration

```ts
// fe/web/tailwind.config.ts (Phase 3 M1-R sub-phase 3-R2)
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        body:    ['var(--font-body)'],
        mono:    ['var(--font-mono)'],
      },
      colors: {
        'nb-primary':         'var(--color-nb-primary)',
        'nb-primary-hover':   'var(--color-nb-primary-hover)',
        'nb-primary-active':  'var(--color-nb-primary-active)',
        'nb-secondary':       'var(--color-nb-secondary)',
        'nb-canvas':          'var(--color-nb-canvas)',
        'nb-surface':         'var(--color-nb-surface)',
        'nb-accent-yellow':   'var(--color-nb-accent-yellow)',
        'nb-accent-mint':     'var(--color-nb-accent-mint)',
        'nb-accent-green':    'var(--color-nb-accent-green)',
        'nb-accent-pink':     'var(--color-nb-accent-pink)',
        'nb-border':          'var(--color-nb-border)',
        'status-active':      'var(--status-active)',
        'status-idle':        'var(--status-idle)',
        'status-outside':     'var(--status-outside)',
        'status-missing':     'var(--status-missing)',
        'status-offline':     'var(--status-offline)',
        'plant-ok':           'var(--plant-ok)',
        'plant-due':          'var(--plant-due)',
        'plant-overdue':      'var(--plant-overdue)',
        // ...and so on — generated table exports the full list
      },
      boxShadow: {
        'nb-xs':     'var(--shadow-nb-xs)',
        'nb-sm':     'var(--shadow-nb-sm)',
        'nb-md':     'var(--shadow-nb-md)',
        'nb-lg':     'var(--shadow-nb-lg)',
        'nb-xl':     'var(--shadow-nb-xl)',
        'nb-hover':  'var(--shadow-nb-hover)',
        'nb-active': 'var(--shadow-nb-active)',
      },
      borderRadius: {
        'nb-none': 'var(--radius-nb-none)',
        'nb-sm':   'var(--radius-nb-sm)',
        'nb-base': 'var(--radius-nb-base)',
        'nb-md':   'var(--radius-nb-md)',
        'nb-lg':   'var(--radius-nb-lg)',
      },
      screens: {
        tablet:  '768px',
        desktop: '1280px',
      },
    },
  },
};

export default config;
```

**No literal hex in this file after Phase 3 M1-R sub-phase 3-R1.** Any hex found by CI grep fails the build.

---

## shadcn/ui primitive integration

Every shadcn/ui primitive we use (Button, Card, Dialog, Dropdown, Select, Input, Label) has its theme tokens rewritten to consume our CSS vars.

Example — `components/ui/button.tsx`:

```tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-nb-base ' +
    'font-display font-semibold transition-all duration-100 ease-out ' +
    'border-nb-base border-nb-border nb-focus ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:   'bg-nb-primary text-nb-border shadow-nb-sm hover:shadow-nb-hover active:shadow-nb-active',
        secondary: 'bg-nb-accent-mint text-nb-border shadow-nb-sm hover:shadow-nb-hover active:shadow-nb-active',
        danger:    'bg-status-missing-bg text-status-missing shadow-nb-sm hover:shadow-nb-hover active:shadow-nb-active',
        ghost:     'hover:bg-nb-surface hover:shadow-nb-xs',
      },
      size: {
        sm:   'h-9 px-3 text-nb-body-sm',
        base: 'h-11 px-4 text-nb-body',
        lg:   'h-12 px-6 text-nb-body-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'base' },
  }
);
```

Same pattern for Card (shadow variants), Dialog (backdrop via `bg-nb-overlay`, panel via `bg-nb-surface + shadow-nb-xl`), Input (`border-nb-base nb-focus`), etc.

---

## Server vs Client component consumption

All token utilities are plain CSS class names — they work in both.

| Context | Reads tokens via | Example |
|---------|------------------|---------|
| Server Component | Static Tailwind classes | `<div className="bg-nb-canvas text-nb-border">...</div>` |
| Client Component | Same + `className` composition | `<Button variant="default" size="lg">...` |
| Inline style (discouraged) | `var(--color-nb-primary)` | `<div style={{ borderColor: 'var(--color-nb-border)' }}>...</div>` |

Inline styles with `var(--*)` are allowed as an escape hatch for dynamic values (e.g., Mapbox paint expressions); they still route through tokens, so they don't break drift guarantees.

---

## How to change a token

1. Edit [`specs/ui-ux/tokens.json`](../ui-ux/tokens.json).
2. Run `npm run tokens:build` from repo root → regenerates `fe/web/src/app/generated/tokens.css` (and mobile side too).
3. Run `npm run tokens:verify` — asserts generator output matches committed files.
4. If Tailwind utility names changed (rare), also update `tailwind.config.ts`.
5. Commit generated file + any config updates in the same PR.

CI steps (`.github/workflows/ci.yml`) enforce:

- `tokens.json` validates against `tokens.schema.json`.
- Generator run matches committed files (byte-for-byte diff).
- ESLint rules on `fe/web/src/**/*.{ts,tsx,css}`:
  - `no-inline-hex-colors` (excludes `src/app/generated/**`)
  - `no-tailwind-shadow-classes-with-blur` (forbids raw `shadow-sm/md/lg/xl/2xl`)
  - `prefer-nb-shadow-utility`
  - `prefer-nb-type-utility`

---

## What is NOT a token (intentionally)

- **Breakpoints** — live only on the web generator (`768 / 1280`), not on mobile; no value in tokenizing since mobile never reads them.
- **PWA manifest strings** (`name`, `short_name`, copy) — product text, not design.
- **Route paths** — not visual.
- **Z-index scale** — use Tailwind's defaults (`z-10`, `z-50` etc.); NB doesn't prescribe a stacking order.
- **Icon sizes** — handled by Lucide's `size` prop, not a token (the set-member is `lucide-react`, already a Layer-1 token).

---

## Related documents

- [specs/ui-ux/design-tokens.md](../ui-ux/design-tokens.md) — canonical registry (both platforms)
- [specs/mobile/design-tokens.md](../mobile/design-tokens.md) — mobile-platform lens
- [specs/ui-ux/tokens.json](../ui-ux/tokens.json) — source of truth
- [specs/ui-ux/neo-brutalism.md](../ui-ux/neo-brutalism.md) — design-language bible
- [specs/ui-ux/responsive-design.md](../ui-ux/responsive-design.md) — breakpoint details
- [ADR-036](../architecture/decisions/ADR-036-design-tokens-single-source.md) — single-source decision
- [ADR-037](../architecture/decisions/ADR-037-web-pwa.md) — PWA adoption
