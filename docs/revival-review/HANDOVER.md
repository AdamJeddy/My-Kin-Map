# Revival handover

**Snapshot: 14 November 2026.** This describes the work on `feature/revival-foundations` since `main` commit `1997a39`, along with the remaining work. The [original review](REPORT.md) is a historical assessment; the [implementation status](IMPLEMENTATION-STATUS.md) explains which findings have since been addressed.

## Product direction

The recommended first audience is someone organizing their first family tree. Lead with the value of bringing family and stories together. The owner is open to optional paid services and sync later; local-only storage and free access are current implementation details, not fixed long-term promises. These are hypotheses to validate with users, not confirmed market demand. See [PRODUCT.md](../../PRODUCT.md) for the current brief.

## Delivered

- Refreshed the first-run experience, desktop sidebar, mobile navigation, tree, directory, person profile and settings. The warm light/dark themes use semantic Tailwind tokens; the visual direction is in [DESIGN.md](../../DESIGN.md).
- Improved tree card spacing, canvas panning, layout updates and initial zoom. The graph includes links from all family records and uses dashed links to distinguish separated partners. Search opens a profile with separate partner and child lists, and a person can be explored from either half of a couple card.
- Added profile shortcuts to create a child or partner, and **Manage family groups** for editing one partnership and its children at a time. Edits guard against cycles, stale changes, duplicate parent groups and accidental reassignment of children; certain ambiguous changes are deliberately blocked or require acknowledgement.
- Made person and relationship saves transactional, preventing unchanged edits from copying children between partnerships. The older person form remains intentionally restricted for relationships it cannot safely express.
- Hardened JSON backups: validate records and links before writing; restore atomically as a merge, replacing matching IDs; accept version 1 backups; preserve photo MIME types and process large photo data in chunks. Browser-local storage can still be lost and an exported backup remains important.
- Added a Vitest command and regression tests for backup and rollback, family relationships and editing, and tree geometry. Added the original product review, implementation notes, design brief and product brief.

## Validation and limits

- On 14 November 2026, after the dependency upgrade, `npm test` passed 23 tests in four files and `npm run build` passed, with large JavaScript bundle and Vite configuration deprecation warnings. Earlier, `npm run lint` reported eight errors in the pre-existing GEDCOM module and four warnings elsewhere.
- Browser checks during implementation used disposable sample data in desktop and emulated mobile/narrow viewports. They covered first run and sample loading, tree controls and orientation, search, profile navigation and editing, family group save and conflict checks, adding relatives, and light/dark themes. They do not certify physical touch, screen readers, keyboard access, contrast or large text.
- A browser backup was exported and restored over the same sample records. Restoring into an empty database, across devices/browsers, and in the browser with photos or quota failures still needs direct testing. Automated tests cover photo bytes and MIME type, large images, invalid records and transactional rollback.
- `npm audit --omit=dev` after the upgrade on 14 November reported five advisories: four high and one critical. These are dependency advisories, not proof that the application's runtime paths are exploitable. Triage reachability and update compatible packages, then repeat the checks.
- The sample layout is improved, but complex family graphs can still have crossing lines or crowded nodes; fit-to-view can make a mobile tree hard to read. Multiple parent groups and richer relationship types are not fully supported. GEDCOM utilities are not exposed as a supported UI flow.
- No deployment, migration of existing user data, physical-device test, accessibility certification or security audit was performed as part of this work. Large JavaScript bundle and existing lint findings remain follow-up items.

## Suggested next sequence

1. **Strengthen confidence in family data:** test restore into a clean browser with photos and old backups, test quota/error handling, and add repeatable browser journeys for creating and editing families. Decide how to recover older backups with invalid links.
2. **Address dependency and quality debt:** investigate the audit advisories and existing lint failures; update dependencies in compatible batches and verify build, PWA and browser flows. Do not apply old automated upgrade PRs without retesting against this branch.
3. **Improve the first meaningful family:** simplify first-person onboarding, quick relative creation and focused mobile navigation; test with first-time users and on real devices, including assistive technology.
4. **Expand the family model:** define relationship types and support complex families, safe deletion, migrations and import/export behavior before promising broad genealogy coverage.
5. **Validate growth features:** test demand for family stories, photos, private sharing and collaboration. Accounts and sync require an explicit consent, security, conflict-resolution, recovery and migration design; pricing remains undecided.

## Working on the code

Run `npm install`, `npm test`, `npm run build`, and `npm run lint`; use `npm run dev` for local browser checks. Core types are in `src/types`, persistence and relationship operations in `src/db`, backup handling in `src/lib/backup.ts`, and graph layout in `src/components/tree`. The existing report contains the baseline screenshots and deeper findings; do not interpret those historical screenshots as the refreshed UI.

The dependency work from Dependabot PRs #1 and #2 was incorporated on this branch: Vite 8, the compatible React and Tailwind Vite plugins, PWA plugin and UUID were updated, with Vitest 4 added for compatibility with Vite 8. The lockfile also incorporates the grouped transitive updates. Node 20.19+, 22.12+, or 24+ is required on the supported lines. The Vite config still uses `__dirname`, which works with the present config loader but produces a warning about a future native loader. A local production preview loaded the sample tree, search and a family profile after the upgrade. Test the deployment preview and PWA upgrade/offline behavior separately before release.
