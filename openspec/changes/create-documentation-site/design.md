# Documentation Site Design

## Architecture

### Tech Stack
- **Framework**: VitePress 1.0+
- **Language**: Markdown + Vue components (for interactive demos if needed).
- **Build Tool**: Vite (under the hood).

### Directory Structure
We will add a new `docs` package to the root:
```
/
├── docs/
│   ├── .vitepress/
│   │   ├── config.ts      # Site configuration (sidebar, nav, theme)
│   │   └── theme/         # Custom theme configuration
│   ├── public/            # Static assets (logo, favicon)
│   ├── index.md           # Home page
│   ├── guide/             # Core documentation
│   ├── frameworks/        # Integration guides
│   └── api/               # API reference
└── ...
```

## Deployment Strategy
We will use a standard GitHub Actions workflow:
1. **Trigger**: Push to `main`.
2. **Build**: Run `pnpm build` in `docs/`.
3. **Artifact**: Upload `docs/.vitepress/dist`.
4. **Deploy**: Use `actions/deploy-pages`.

## Content Strategy
- **Simplicity**: Focus on copy-pasteable code snippets.
- **Navigation**:
  - Top Nav: Guide, Config, API, GitHub Link.
  - Sidebar: Context-aware sidebar (different for Guide vs API).
