# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Production build to dist/
npm run preview   # Serve the production build locally
npm run lint      # ESLint check
```

## Architecture

React 19 + Vite 8 single-page app. There is no router, no backend, and no test suite.

- **`src/App.jsx`** — the single root component; all feature code starts here
- **`src/main.jsx`** — React DOM entry point, mounts `<App />` into `#root`
- **`public/icons.svg`** — SVG sprite sheet; reference symbols with `<use href="/icons.svg#icon-name">`
- **`vite.config.js`** — minimal config using `@vitejs/plugin-react` (Oxc parser)

## Styling

CSS files use Vite's native support for nested selectors (no Sass required) and CSS custom properties defined in `index.css`. Dark mode is handled via `prefers-color-scheme` media query, not a JS toggle.

## Linting

ESLint 9 flat config (`eslint.config.js`). Unused vars are allowed when the name starts with an uppercase letter or underscore — don't change that rule without a reason.
