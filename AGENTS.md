# AGENTS.md

Scope: Applies to the entire repository unless a deeper `AGENTS.md` overrides it.

## Repository Areas
- App (root): Next.js application in the repository root (`components/`, `pages/`, `lib/`, etc.).
- Docs (`docs/`): Docusaurus site with its own config and build pipeline.

## Working Rules
- Pick the target area first (app vs docs), then run only relevant commands.
- Keep changes scoped to the requested area; avoid unrelated refactors.
- For any file under `docs/`, follow `docs/AGENTS.md` (it overrides this file for docs work).

## Commits
- Use a short summary line, then list each change on its own line prefixed with a hyphen.
- Do not combine multiple changes into a single sentence.

## Validation
- App changes: run root checks when relevant (`npm run lint`, `npm run test`, `npm run build`).
- Docs changes: run docs checks when relevant (`npm --prefix docs run build`, `npm --prefix docs run typecheck`).
