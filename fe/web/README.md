# SEKAR Web Dashboard

**Phase 2D - Next.js 14+ Web Dashboard with Neo Brutalism Design System**

Modern web dashboard for SEKAR (Sistem Evaluasi Kerja Satgas RTH) - worker tracking and task management system for DLH Surabaya.

## Tech Stack

- **Framework:** Next.js 16.1.4 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **State Management:**
  - Server State: TanStack Query (React Query)
  - Client State: Zustand
- **HTTP Client:** Axios
- **Forms:** React Hook Form + Zod
- **Maps:** Mapbox GL + Mapbox GL Draw
- **Icons:** Heroicons
- **Real-time:** Socket.IO Client
- **Testing:**
  - Unit Tests: Jest + React Testing Library
  - E2E Tests: Playwright

## Project Structure

```
fe/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth route group
│   │   │   └── login/         # Login page
│   │   ├── (dashboard)/       # Dashboard route group
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page (redirects)
│   │   ├── providers.tsx      # App providers (TanStack Query)
│   │   └── globals.css        # Global styles + NB design tokens
│   ├── components/
│   │   └── nb/                # Neo Brutalism component library
│   ├── lib/
│   │   ├── api/               # API client and services
│   │   │   └── client.ts      # Axios instance with token refresh
│   │   └── utils/
│   │       └── cn.ts          # className utility
│   ├── hooks/                 # Custom React hooks
│   ├── stores/                # Zustand stores
│   └── types/                 # TypeScript type definitions
├── e2e/                       # Playwright E2E tests
├── public/                    # Static assets
├── .env.local                 # Local environment variables
├── .env.example               # Environment variables template
├── jest.config.ts             # Jest configuration
├── playwright.config.ts       # Playwright configuration
├── next.config.ts             # Next.js configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# Mapbox (get token from https://account.mapbox.com/access-tokens/)
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token-here

# App
NEXT_PUBLIC_APP_NAME=SEKAR
NEXT_PUBLIC_APP_VERSION=2.0.0
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm run start
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Lint code with ESLint |
| `npm run lint:fix` | Fix linting errors |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run E2E tests with Playwright |
| `npm run test:e2e:ui` | Run E2E tests with UI |
| `npm run type-check` | Check TypeScript types |

## Neo Brutalism Design System

This project uses a consistent Neo Brutalism design system matching the Phase 2C mobile app.

### Design Principles

1. **Bold & Confident** - Heavy 3px borders, hard-edge shadows
2. **Function Over Decoration** - Every element serves a purpose
3. **High Visibility** - Designed for office settings with varying light
4. **Honest Materials** - No gradients, no rounded corners, no soft shadows
5. **Instant Recognition** - Distinctive style makes SEKAR identifiable

### Color Palette

```typescript
// Primary
primary: '#0066CC'
primary-hover: '#0052A3'
primary-active: '#003D7A'

// Status
success: '#1B5E20'
warning: '#F57C00'
danger: '#DC2626'

// Neutrals
black: '#000000'
white: '#FFFFFF'
navy: '#001F3F'

// Gray Scale
gray-50 to gray-900
```

### Shadows

Hard-edge offset shadows (no blur):

```css
shadow-nb-sm: 4px 4px 0px #000000
shadow-nb-md: 6px 6px 0px #000000
shadow-nb-lg: 8px 8px 0px #000000
```

### Typography

- **Font Family:** Inter
- **Weights:** 400, 500, 600, 700, 800
- **Scale:** xs (12px) to 4xl (36px)
- **Line Heights:** Optimized for readability

### Spacing

8px baseline grid:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

## API Integration

### API Client

The API client (`src/lib/api/client.ts`) provides:

- Automatic token refresh on 401 errors
- Request/response interceptors
- Cookie-based authentication
- Error handling utilities
- TypeScript types

### Usage Example

```typescript
import { apiClient } from '@/lib/api/client';

// GET request
const response = await apiClient.get('/users');

// POST request
const response = await apiClient.post('/auth/login', {
  username: 'user',
  password: 'pass'
});
```

## Component Library

Neo Brutalism components will be implemented in Phase 2D-2:

- NBButton - Button with 5 variants
- NBCard - Card with header/content/footer
- NBInput - Text input with validation
- NBTextarea - Multi-line input
- NBSelect - Dropdown select
- NBBadge - Status badges
- NBTable - Data tables
- NBModal - Dialogs and modals
- NBSidebar - Navigation sidebar
- NBDropdown - Action menus

## Testing

### Unit Tests

```bash
npm test                 # Run once
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage
```

Coverage requirement: 80% for branches, functions, lines, and statements.

### E2E Tests

```bash
npm run test:e2e         # Run E2E tests
npm run test:e2e:ui      # Run with UI
```

Tests run on:
- Desktop Chrome, Firefox, Safari
- Mobile Chrome, Safari

## Accessibility

WCAG 2.1 AA compliant:

- Proper color contrast ratios (4.5:1 minimum)
- Keyboard navigation support
- Focus indicators (4px outline offset)
- Screen reader compatible
- Minimum touch targets (48x48px)
- Reduced motion support

## Responsive Design

Breakpoints:
- sm: 640px (Small tablets)
- md: 768px (Tablets landscape)
- lg: 1024px (Small laptops)
- xl: 1280px (Desktops)
- 2xl: 1536px (Large desktops)

Max content width: 1440px

## Development Workflow

1. Create feature branch from `main`
2. Implement feature with tests
3. Run `npm run lint:fix` and `npm run format`
4. Run `npm test` and `npm run test:e2e`
5. Ensure `npm run build` succeeds
6. Create pull request

## Project Status

**Phase 2D-1: Foundation - COMPLETE ✅**

- [x] Next.js 14+ project initialized
- [x] Tailwind CSS 4 configured with NB design tokens
- [x] All dependencies installed
- [x] Project structure created
- [x] API client with token refresh implemented
- [x] ESLint and Prettier configured
- [x] Jest and Playwright configured
- [x] Environment variables set up
- [x] Basic login and dashboard pages scaffolded
- [x] Build passes with no errors

**Next Phase: 2D-2 - Component Library**

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query)
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js)
- [Design System Specification](../../specs/ui-ux/phase-2d-web-design-system.md)

## Contributing

See main project [CLAUDE.md](../../CLAUDE.md) for coding standards and development guidelines.

## License

Copyright © 2026 DLH Surabaya. All rights reserved.
