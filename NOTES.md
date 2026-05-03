# Brikko Studio — Working Notes

In-repo running log of decisions, follow-ups, and known issues. The plan lives at
`C:\Users\gridc\Desktop\Стартап\docs\superpowers\plans\2026-05-03-brikko-studio-m0-foundations.md`.

## 2026-05-03 — Tooling switch (CEO decision)

CEO chose **pnpm + oxlint** to match upstream OpenClaw. Tasks 2 & 6 of the plan
were originally written for npm + eslint + prettier; this session migrated them.

### What changed

- Root `package.json`: removed `"workspaces": ["packages/*"]`; replaced eslint
  scripts with oxlint; added `"packageManager": "pnpm@10.33.2"`.
- New root `pnpm-workspace.yaml` referencing `packages/*`,
  `packages/core/extensions/*`, `packages/core/packages/*`, `packages/core/ui`.
- Restored `packages/core/pnpm-workspace.yaml` and `packages/core/.npmrc` from
  the `.upstream` backups (Task 3 had renamed them to dodge our root npm setup).
- Renamed `packages/core/package.json#x-pnpm-upstream` back to `pnpm` via Node
  (preserves all upstream pnpm config — overrides, onlyBuiltDependencies, etc.).
- Deleted root `package-lock.json`.
- Added root `.oxlintrc.json` with the upstream's ignore patterns.

### oxfmt fallback

The plan originally listed `@oxc/oxfmt` as a devDependency. oxfmt is Rust-based
and very new — not all team members will have a working npm package release yet.
Decision: **use Prettier as the formatter** (`npm run format` runs
`prettier --write`) until oxfmt's npm distribution stabilizes. oxlint covers
linting fine; formatting via prettier is fast enough.

### `pnpm install` outcome

First run: `corepack pnpm install` — fetched 1217 packages successfully (~5min,
slow due to ru-side latency to npm registry; many "Tarball download average
speed below 50 KiB/s" warnings, but no install errors). Then the
`packages/core` postinstall script blew up — see "BLOCKER" below.

Second run with `--ignore-scripts`: clean exit in 2.3s, lockfile already
up-to-date. Workspace has 126 projects after restoring upstream's
pnpm-workspace.yaml.

Warnings (upstream-owned, not blockers): pnpm 10 prefers `pnpm.overrides` etc.
at workspace root rather than in `packages/core/package.json`. Upstream
OpenClaw's package.json predates this; we'll either lift those into the root
on a future pnpm upgrade or wait for upstream to migrate.

## 2026-05-03 — BLOCKER for build/test inside packages/core

The Task 4 rebrand (commit `6136c07c`) ran a sed substitution
`OpenClaw → Brikko Studio` (with a literal SPACE) across all of
`packages/core/`. This **corrupts identifiers** wherever `OpenClaw` appeared in
function names, type names, variable names, or import paths.

**Scope:** 3290 files contain a `Brikko Studio<wordChar>` token; 17542 total
occurrences. Examples that immediately broke:

- `packages/core/scripts/postinstall-bundled-plugins.mjs` line 126:
  `function resolvePostinstallBrikko StudioHomeDir(env, …)` — SyntaxError.
- `packages/core/scripts/blacksmith-testbox-state.mjs`:
  `evaluateBrikko StudioTestboxClaim`, `writeBrikko StudioTestboxClaim`, etc.
- Many more in `scripts/`, `src/`, type names in `apps/`.

**Root cause:** The sed pass should have used PascalCase `BrikkoStudio` for
identifiers and reserved `Brikko Studio` (with space) for human-readable
strings (UX text in JSON catalogs, README, comments). It didn't disambiguate.

**Fix strategy (separate task — DO NOT bundle into Part A commit):**

1. For identifiers: globally replace `Brikko Studio` (with space) inside
   `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs` source files with `BrikkoStudio`
   (no space).
2. For strings inside JSON catalogs (e.g. `i18n/*.json`), README, comments,
   and prose: `Brikko Studio` (with space) is correct — leave alone.
3. Revisit any test fixtures that intentionally hard-code branding.
4. Re-run `corepack pnpm install` (without `--ignore-scripts`) to confirm
   postinstall passes.
5. Re-run `pnpm -r build` / `pnpm -r test` inside `packages/core`.

This is not a Part A blocker because Part A only needs the lockfile + the
workspace topology. It IS a blocker for any work that needs to actually run
upstream code (Task 13 docker build, M1 PII work, M2 plugins).

## Open follow-ups

- [ ] Fix Task 4 identifier corruption (see BLOCKER above) before M0 Task 13.
- [ ] If pnpm 11+ enforces "pnpm.* fields must be at workspace root", lift
      upstream's `overrides` / `onlyBuiltDependencies` etc. from
      `packages/core/package.json` into our root `package.json`.
- [ ] Replace prettier with oxfmt once `@oxc/oxfmt` (or the equivalent) ships
      a stable npm release. Keep prettier config minimal so the swap is easy.
- [ ] Root `tsconfig.json` excludes `packages/core/**` — see Task 6 commit.
      packages/core is upstream territory and ships its own tsgo workflow.
