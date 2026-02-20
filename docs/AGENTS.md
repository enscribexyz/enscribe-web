# AGENTS.md (docs)

Scope: Applies to everything under `docs/`.

## Purpose
This directory is the Enscribe documentation site (Docusaurus). Prioritize documentation quality, factual accuracy, and editorial consistency.

## Required Editorial Source
Before writing or editing narrative docs/blog content, read and follow:
- `docs/EDITORIAL_STYLE_GUIDE.md`

If this file is not available, stop and ask the user for the current style-guide location before continuing with content edits.

## Editorial Requirements
- Always use `Enscribe` exactly with this capitalization.
- Prefer `onchain` (not `web3`, `crypto`, `on-chain`, or `on chain`) unless quoting sources.
- Use plain, active, concrete language; explain technical terms briefly when needed.
- Avoid hype, financial promises, token-centric framing, and unverified claims.
- Avoid banned AI-marketing phrasing from the style guide (for example: "seamless", "revolutionary", "game-changing", "frictionless").
- Use sentence case for headings.
- Use the Oxford comma.
- Format dates like `June 5, 2025`.

## Docs Workflow
- Keep Docusaurus structure intact (`docs/docs/`, `docs/blog/`, `docs/guides/`, sidebars/config).
- Preserve frontmatter and heading hierarchy when editing markdown/mdx.
- For behavior/config changes, validate with:
  - `npm --prefix docs run typecheck`
  - `npm --prefix docs run build`
