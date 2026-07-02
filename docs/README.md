# Feima Copilot Documentation

A Docs-as-Code system built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build) for the feima-copilot-llms-extension VS Code extension.

## Overview

This is a **Docs-as-Code** system where documentation is written in Markdown alongside the source code, built with a static site generator, and deployed via CI/CD.

Two separate single-language artifacts are built and deployed:
- **English** → GitHub Pages (global users)
- **Chinese** → Alibaba OSS + CDN (China users)

## Architecture

```
feima-copilot-llms-extension/              # Main project
├── src/                                   # Extension source code
├── docs/                                  # Documentation site (this directory)
│   ├── src/                               # English source (+ bilingual dev)
│   │   └── content/
│   │       ├── config.ts                  # Content collection schema
│   │       └── docs/                      # English docs (root locale)
│   │           ├── index.md
│   │           ├── guides/
│   │           ├── reference/
│   │           ├── dev/
│   │           └── zh/                    # Chinese docs (bilingual dev only)
│   │               ├── index.md
│   │               ├── guides/
│   │               ├── reference/
│   │               └── dev/
│   ├── src-zh/                            # Chinese source (ZH-only builds)
│   │   └── content/
│   │       ├── config.ts                  # Same schema as src/content/config.ts
│   │       └── docs -> ../../src/content/docs/zh  # Symlink to Chinese content
│   ├── astro.config.mjs                  # Astro + Starlight config
│   ├── package.json                      # Docs dependencies
│   └── public/                           # Static assets
├── docs/dist/                            # Built documentation (not committed)
└── dist/                                 # Extension build (esbuild)
```

## Key Design Decisions

### Build Output Location

The docs build to `docs/dist/` (inside the `docs/` directory). This keeps the output alongside `docs/node_modules/` so Node.js can resolve SSR-externalized packages during the build.

### Single-Language Builds via `srcDir` + `BUILD_LOCALE`

Each artifact is a **single-language site** — Chinese or English served at the root URL (`/`), no language switcher or locale prefix in URLs.

| `BUILD_LOCALE` | `srcDir` | Root locale | Pages at |
|----------------|----------|-------------|----------|
| `en` | `./src` | English | `/` |
| `zh` | `./src-zh` | Chinese | `/` |
| _(unset)_ | `./src` | English (root) + Chinese (`/zh/`) | bilingual dev |

The `src-zh/content/docs` directory is a symlink to `src/content/docs/zh/`, so Chinese content is maintained in one place and shared between bilingual dev and ZH production builds.

### Multi-Deployment Configuration

`SITE_URL` and `BASE_PATH` are set at build time via environment variables:

| Target | `BUILD_LOCALE` | `SITE_URL` | `BASE_PATH` | Final URL |
|--------|----------------|-----------|------------|-----------|
| GitHub Pages | `en` | `https://ivenxu.github.io` | `/feima-copilot-llms-extension` | https://ivenxu.github.io/feima-copilot-llms-extension/ |
| Alibaba OSS/CDN | `zh` | `https://feimacode.com` | `/docs` | https://feimacode.com/docs/ |

### Separate Package Management

- `/package.json` → Extension dependencies and build scripts
- `/docs/package.json` → Documentation dependencies only

## Development

### Start Local Dev Server

```bash
# Bilingual (English root + Chinese at /zh/) — default
cd docs && npm run dev

# English only
cd docs && BUILD_LOCALE=en npm run dev

# Chinese only
cd docs && BUILD_LOCALE=zh npm run dev
```

Local dev URL: http://localhost:4321/feima-copilot-llms-extension

### Build for Production

```bash
# English (GitHub Pages)
cd docs
BUILD_LOCALE=en SITE_URL=https://ivenxu.github.io BASE_PATH=/feima-copilot-llms-extension npm run build

# Chinese (Alibaba OSS)
cd docs
BUILD_LOCALE=zh SITE_URL=https://feimacode.com BASE_PATH=/docs npm run build
```

### Preview Production Build

```bash
cd docs && npm run preview
```

## Content Structure

### Adding New Pages

1. Create a `.md` file in `src/content/docs/` for English (and `src/content/docs/zh/` for Chinese)
2. Add frontmatter:

```markdown
---
title: Page Title
description: Page description
---

# Your content here
```

3. Update the sidebar in `astro.config.mjs` (`sidebarEn` / `sidebarZh`)

### Content Location

| Language | Source location | Served at (EN build) | Served at (ZH build) |
|----------|----------------|----------------------|----------------------|
| English | `src/content/docs/*.md` | `/` (root) | — |
| Chinese | `src/content/docs/zh/*.md` | `/zh/` (bilingual dev) | `/` (root) |

## Deployment

### CI/CD Pipeline

Deployment is automated via `.github/workflows/deploy-docs.yml`:

**On push to `main`** (English only):
1. `build-en` job: builds with `BUILD_LOCALE=en` + GitHub Pages env vars, uploads artifact
2. `deploy-github-pages` job: deploys artifact to GitHub Pages

**On manual trigger (`workflow_dispatch`)** (Chinese/OSS):
1. `build-zh` job: builds with `BUILD_LOCALE=zh` + OSS env vars, uploads `docs-oss` artifact
2. `deploy-oss` job: downloads artifact, deploys to Alibaba OSS, refreshes CDN

### Required GitHub Secrets (China Deployment)

Configure these in repository settings:

| Secret | Purpose |
|--------|---------|
| `ALIYUN_ACCESS_KEY_ID` | Alibaba Cloud Access Key ID |
| `ALIYUN_ACCESS_KEY_SECRET` | Alibaba Cloud Access Key Secret |
| `ALIYUN_OSS_BUCKET` | OSS bucket name |
| `ALIYUN_OSS_REGION` | OSS region (e.g., `cn-hangzhou`) |

## Scripts (Root package.json)

| Script | Action |
|--------|--------|
| `npm run docs:dev` | Start dev server (bilingual) |
| `npm run docs:build` | Build production site (English, GitHub Pages config) |
| `npm run docs:preview` | Preview production build |
| `npm run ext:build` | Build extension |
| `npm run ext:compile` | Compile extension for development |

## Technologies

| Technology | Purpose |
|------------|---------|
| **Astro** | Static site generator |
| **Starlight** | Documentation framework (theme, navigation, search) |
| **Markdown** | Content authoring |
| **TypeScript** | Content schema validation |
| **GitHub Actions** | CI/CD deployment |
| **GitHub Pages** | Global (English) hosting |
| **Alibaba OSS** | China (Chinese) hosting |

## Resources

- [Astro Documentation](https://docs.astro.build)
- [Starlight Documentation](https://starlight.astro.build)
- [Project Repository](https://github.com/feimacode/feima-copilot-llms-extension)

## Architecture

```
feima-copilot-llms-extension/              # Main project
├── src/                                   # Extension source code
├── docs/                                  # Documentation site (this directory)
│   ├── src/
│   │   ├── content/docs/                  # Markdown documentation
│   │   │   ├── index.md                  # Chinese landing page (root locale)
│   │   │   ├── guides/                   # User guides (Chinese)
│   │   │   ├── reference/                # API/reference docs (Chinese)
│   │   │   ├── dev/                      # Developer docs (Chinese)
│   │   │   └── en/                       # English locale
│   │   └── content/config.ts             # Content collection schema
│   ├── astro.config.mjs                  # Astro + Starlight config
│   ├── package.json                      # Docs dependencies
│   └── public/                           # Static assets
├── docs/dist/                            # Built documentation (not committed)
└── dist/                                 # Extension build (esbuild)
```

## Key Design Decisions

### Build Output Location

The docs build to `docs/dist/` (inside the `docs/` directory). This keeps the output alongside `docs/node_modules/` so Node.js can resolve SSR-externalized packages during the build.

```javascript
// astro.config.mjs
export default defineConfig({
  output: 'static',
  outDir: './dist',           // Inside docs/ — keeps module resolution working
  site: process.env.SITE_URL ?? 'https://ivenxu.github.io',
  base: process.env.BASE_PATH ?? '/feima-copilot-llms-extension',
});
```

### Multi-Deployment Configuration

The `site` and `base` values differ per deployment target and are controlled via environment variables at build time:

| Target | `SITE_URL` | `BASE_PATH` | Final URL |
|--------|-----------|------------|-----------|
| GitHub Pages (default) | `https://ivenxu.github.io` | `/feima-copilot-llms-extension` | https://ivenxu.github.io/feima-copilot-llms-extension/ |
| Alibaba OSS/CDN | `https://feimacode.com` | `/docs` | https://feimacode.com/docs/ |

The CI builds the site **twice** — once per target — using different env vars, ensuring correct asset paths for each deployment.

### Separate Package Management

- `/package.json` → Extension dependencies and build scripts
- `/docs/package.json` → Documentation dependencies only

### Root-Level `/docs` Directory

Documentation lives at the project root (following patterns used by Vite, Astro, etc.), not in a separate `/website` directory.

## Development

### Start Local Dev Server

```bash
# From project root
npm run docs:dev

# Or directly in docs/ directory
cd docs
npm run dev
```

Visit http://localhost:4321/feima-copilot-llms-extension to view the site. Changes auto-reload.

> **Note:** The local dev server uses the default `BASE_PATH` (`/feima-copilot-llms-extension`).
> To use a different base locally, set the env var: `BASE_PATH=/docs npm run dev`

### Build for Production

```bash
npm run docs:build
```

Output is written to `docs/dist/` (inside the `docs/` directory).

### Preview Production Build

```bash
npm run docs:preview
```

Serves the built `docs/dist/` locally for final verification.

## Content Structure

### Navigation (Sidebar)

The sidebar is defined in `astro.config.mjs`:

```javascript
sidebar: [
  {
    label: 'Start Here',
    items: [
      { label: 'Introduction', link: '/' },
      { label: 'Quick Start', link: '/guides/quickstart' },
      { label: 'Installation', link: '/guides/installation' },
    ],
  },
  {
    label: 'User Guide',
    items: [
      { label: 'Authentication', link: '/guides/authentication' },
      { label: 'Using Models', link: '/guides/using-models' },
      { label: 'Configuration', link: '/guides/configuration' },
    ],
  },
  {
    label: 'Development',
    items: [
      { label: 'Development Setup', link: '/dev/setup' },
      { label: 'Testing', link: '/dev/testing' },
      { label: 'Building', link: '/dev/building' },
    ],
  },
]
```

### Adding New Pages

1. Create a `.md` file in `src/content/docs/` (or subdirectory)
2. Add frontmatter:

```markdown
---
title: Page Title
description: Page description
---

# Your content here
```

3. Update sidebar in `astro.config.mjs` to include the new page

### Bilingual Support

Chinese is the **root locale** and English lives under `en/`:

```
src/content/docs/
├── index.md              # Chinese (root locale)
├── guides/quickstart.md  # Chinese
└── en/
    ├── index.md          # English
    └── guides/
        └── quickstart.md # English
```

Pages without an English translation fall back to the Chinese version automatically.

The language switcher is shown in the sidebar. Both languages are served from the same build.

## Deployment

### Dual Deployment Strategy

The documentation is deployed to both GitHub Pages (global) and Alibaba OSS + CDN (China) from the same source. The CI builds the site **twice** with different environment variables:

| Target | `SITE_URL` | `BASE_PATH` | URL |
|--------|-----------|------------|-----|
| GitHub Pages | `https://ivenxu.github.io` | `/feima-copilot-llms-extension` | https://ivenxu.github.io/feima-copilot-llms-extension/ |
| Alibaba OSS | `https://feimacode.com` | `/docs` | https://feimacode.com/docs/ |

Both deployments serve the full bilingual site (CN + EN) — users switch language via the sidebar picker.

### CI/CD Pipeline

Deployment is automated via `.github/workflows/deploy-docs.yml`:

1. Triggers on push to `main` branch (changes to `docs/**` or `README.md`)
2. `build` job:
   - Installs dependencies once
   - Builds with GitHub Pages config → uploads as `upload-pages-artifact`
   - Builds with OSS config → uploads as `docs-oss` artifact
3. `deploy-github-pages` job: deploys to GitHub Pages
4. `deploy-oss` job: downloads `docs-oss` artifact, deploys to Alibaba OSS, refreshes CDN

### Required GitHub Secrets (China Deployment)

Configure these in repository settings:

| Secret | Purpose |
|--------|---------|
| `ALIYUN_ACCESS_KEY_ID` | Alibaba Cloud Access Key ID |
| `ALIYUN_ACCESS_KEY_SECRET` | Alibaba Cloud Access Key Secret |
| `ALIYUN_OSS_BUCKET` | OSS bucket name |
| `ALIYUN_OSS_REGION` | OSS region (e.g., `cn-hangzhou`) |

## Scripts (Root package.json)

| Script | Action |
|--------|--------|
| `npm run docs:dev` | Start dev server |
| `npm run docs:build` | Build production site |
| `npm run docs:preview` | Preview production build |
| `npm run ext:build` | Build extension |
| `npm run ext:compile` | Compile extension for development |

## Technologies

| Technology | Purpose |
|------------|---------|
| **Astro** | Static site generator |
| **Starlight** | Documentation framework (theme, navigation, search) |
| **Markdown** | Content authoring |
| **TypeScript** | Content schema validation |
| **GitHub Actions** | CI/CD deployment |
| **GitHub Pages** | Global hosting |
| **Alibaba OSS** | China hosting |

## Resources

- [Astro Documentation](https://docs.astro.build)
- [Starlight Documentation](https://starlight.astro.build)
- [Project Repository](https://github.com/feimacode/feima-copilot-llms-extension)