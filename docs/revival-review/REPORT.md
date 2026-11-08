# My Kin Map: revival review and product plan

Reviewed 14 November 2026 against local `main` at `1997a39`. Audience: a wider public. Owner direction: device-local and free are not firm long-term commitments or the leading proposition; paid services may be considered later. The owner delegated the choice of initial audience. This is a decision and implementation handover, not a security certification or a promise of delivery dates.

## Executive decision

**Continue from this codebase, with a focused stabilization phase before adding major features or inviting a broad public audience.** The existing React/TypeScript, IndexedDB and graph-canvas foundation is useful, a production build succeeds, and the app has real product substance. A rewrite would discard useful work before its limits are understood. However, core graph readability, relationship editing, backup reliability and automated verification need attention first. Treat the existing implementation as an early prototype, not a production-ready foundation for irreplaceable family records.

The proposition worth exploring is **an easy way to bring your family together, starting with a family tree and growing into a shared record of the people and stories that matter**. Lead with the emotional and practical benefit; protect family data and make ownership, recovery and sharing understandable. Simplicity, storytelling and collaboration are hypotheses, not validated demand. Local storage is the current architecture, not a strategic constraint; changing it needs an explicit privacy and migration design.

## What exists

- React, TypeScript, Vite, Dexie/IndexedDB, React Flow, Dagre and a generated PWA service worker. No backend or account system was found in the reviewed application.
- Local people and family records, photo selection, names, birth/death facts and notes; relationship selection; searchable people; graph layout, zoom, pan and orientation controls; desktop sidebar and mobile bottom navigation.
- JSON backup/restore and sample data in Settings; local persistence requested from the browser. GEDCOM import/export functions exist in `src/lib/gedcom/index.ts`, but no application UI or call sites were found. The README's GEDCOM import claim therefore exceeds the visible product.
- A data model includes trees and revision/deletion fields, but `usePersonsByTree` returns all people and synchronization is not implemented. These are scaffolding, not evidence of supported multiple trees or sync.

## Findings in priority order

### P0: Protect family data before expansion

1. **Backup is a fragile trust boundary.** `src/pages/SettingsPage.tsx` checks only for `version` and `persons`, then writes records one by one without a transaction. A malformed file, interrupted import or storage error can leave a partially overwritten database; identical IDs are overwritten. Validate version, types, IDs, links and dates before any writes, show a clear preview and conflict strategy, and commit atomically. Test failed imports leave the database unchanged. Restore creates photos without their original MIME type; verify real image round trips and preserve media metadata. Export converts each whole photo through a spread into `String.fromCharCode`, which can exceed JavaScript argument limits for sufficiently large files; test realistic phone photos and use a bounded encoding method.
2. **Browser-only is not equivalent to a backup.** Users can lose local data when browser data is cleared, a device is lost, or storage is evicted. `requestPersistentStorage` can be denied and its result is only logged. Clearly explain device/browser scope, recovery limitations and backup cadence; surface persistence status when useful. Test export and restore across browsers and devices. Avoid the README's unconditional “Your Data is Safe” language.
3. **Relationship editing can change or retain the wrong links.** `PersonEditor.tsx` loads only the first spouse and at most two parents, aggregates children across spouse families, then adds all selected children to the currently selected family. Editing a person with children from multiple partnerships can therefore add children to an additional partnership; removing/changing a spouse does not explicitly remove the old family. Save operations are not one transaction. Define relationship invariants and explicit family editing, then add regression tests for multiple partnerships, single parents, removal, cycles, duplicates and partial failures before relying on edits. This is a code-path finding; those scenarios were not executed end-to-end in this review.

### P1: Make the core experience usable and verifiable

4. **The sample tree overlaps substantially.** On both 390×844 mobile and 1440×900 desktop, the loaded sample showed people, couple cards and connecting lines colliding. This makes the central promise difficult to use even with a modest family. Investigate measured node dimensions and layout handling in `src/components/tree/layout.ts` and `FamilyTreeView.tsx`; do not assume the cause before reproducing. Add fixtures and visual/geometry checks for branching, disconnected people, multiple partnerships and both orientations. Provide a focused-person or list view for mobile and preserve readable zoom.
5. **No automated test command or test suite was found.** `package.json` offers build and lint only. Prioritize meaningful tests around relationship invariants, GEDCOM/JSON round trips, migration and layout; add browser journeys for first person, edits, backup and recovery. Add CI after agreeing on supported browsers.
6. **Quality gates need repair.** `npm run build` passed; its output warned about a 796 kB minified JavaScript chunk (252 kB gzip). `npm run lint` failed with 12 errors and 5 warnings. `npm audit` reported 31 dependency advisories: 1 critical, 18 high, 9 moderate and 3 low, including development dependencies. Counts describe dependency advisories, not proven application exploits. Triage reachability, update in compatible batches and re-run tests; do not blindly apply breaking automatic fixes.
7. **Interoperability and product claims are misaligned.** GEDCOM functions have no visible entry points, and the README references features and paths that do not match the application. Define supported GEDCOM versions, fields and known losses, then expose and test import/export if they are a product commitment. Fix the README, including browser storage limits and support routes. Clarify contribution guidance alongside the proprietary license, which requires prior written permission for use or modification.

### P2: Design and operational maturity

8. The data model permits only one pair in a family and the editor presents a single spouse; names and sex choices may not suit many families or cultures. Understand actual user needs before designing a more inclusive, explicit relationship model and migration. Preserve unknown/approximate facts and distinguish biological, adoptive and other relationships where users need them.
9. Photo storage duplicates the original as a thumbnail. Large libraries can exhaust quota; define limits, thumbnailing, quota errors and cleanup. Verify privacy and security beyond static inspection, including dependencies, hosting, content security policy and offline/update behavior.
10. Multi-device sync and collaboration would require identity, consent, authorization, conflict resolution, recovery and a revised privacy promise. Revision fields alone do not solve these. Validate the demand and choose a threat model before selecting an architecture.

## UI audit: observed journey

Evidence is a local development build using the bundled sample, not real family records. Screenshots were captured in an in-app browser; viewport emulation is not a physical-device test. No assistive technology, keyboard-only walkthrough, formal contrast assessment, offline installation, production deployment, or long-term storage test was completed.

1. **Empty start — promising.** A direct choice to add a person or explore sample data gives a user a way in. Explain privacy and backup consequences at the point of commitment, and make sample data clearly separable from real records. Loading sample data currently merges by ID rather than isolating a demo.
2. **Explore sample tree — poor.** [Mobile tree](mobile-tree.jpg) and [desktop tree](desktop-tree.jpg) show overlapping cards and links. Mobile also has only a small slice of the graph in view at readable scale. Prioritize focused family navigation, discoverable zoom/fit actions, predictable layout and clear person selection. Offer a list as a first-class alternative.
3. **Find someone — reasonably clear.** [Mobile search](mobile-search.jpg) uses legible rows and useful dates/places. The floating add button obscures part of the list in the captured view. Give scrolling content safe clearance and make the field's accessible name explicit; the captured accessibility tree showed an unnamed text field. Search currently opens editing directly, so consider a profile first with an explicit edit action.
4. **Edit a person — functional but dense.** [Mobile editor](mobile-editor.jpg) provides recognizable labeled fields, but its long scrolling sheet puts relationship controls and save action far below the first screen; several controls appear unnamed in the accessibility tree. Group basic facts and relationships, reduce mandatory inputs where appropriate, give date/place fields and icon-only controls accessible names, and keep the next action discoverable. Test keyboard focus, screen readers and large text.
5. **Settings and recovery — available but insufficiently explained.** The inspected mobile and desktop settings offer backup, import, sample and delete. Explain restore/merge behavior, conflict impact, last successful backup and risks of device loss in everyday language. Keep destructive and demo operations distinct. The mobile floating add button also visually competes with settings content.

Desktop has more room and a persistent sidebar, minimap and labeled layout controls. It still needs the same layout correction and a clearer task hierarchy. These observations do not establish accessibility compliance or real-device gesture quality.

## Product direction and opportunities

**Recommended initial audience: the family organizer creating their first tree.** They provide a clear starting journey: add yourself, add a few relatives, see the connections and share something meaningful. This makes the current product easier to evaluate and creates a natural path to stories and collaboration. This is a strategic recommendation, not evidence of market demand. Interview beginners and observe their first session; also speak to a few experienced genealogists to avoid foreclosing future portability, without making advanced research workflows the first-release bar.

Suggested positioning to validate: **bring your family story together, one person at a time**. Make privacy, reliability and control visible when they matter, but lead with the outcome. The existing local-only model is an implementation starting point, not a permanent product promise. Optional accounts, sync and paid services are open decisions; no pricing or commercial model has been approved.

| Opportunity | User value | Dependencies / decision |
| --- | --- | --- |
| Guided first tree and quick add relative | Reach a meaningful tree with less work | Reliable relationship model and thoughtful onboarding |
| Focused person/family view, list and search-to-tree | Navigate a larger family on mobile | Stable layout, accessible controls |
| Reliable backup, restore and device transfer | Confidence to invest time and data | Format validation, transactionality, media tests |
| Photos, stories, sources and life events | Preserve meaning beyond names and dates | Storage budget, consent, data model, export support |
| Printable/shareable family view | Make the tree useful in family conversations | Privacy defaults and explicit redaction of living people |
| Private collaboration and optional sync | Reduce duplicate work and bridge devices | Product choice, security model, conflict and recovery design, operating costs |
| Timeline, map, anniversaries | Discover family history | Reliable dates/places and user validation; privacy-aware defaults |
| GEDCOM compatibility | Make switching and portability credible | Standards fixtures, loss disclosure and round-trip tests |

Do not commit to a social network, AI features, a native app or specific paid tiers until interviews establish a problem they solve. Use privacy-conscious research and analytics, explain data practices clearly, and avoid collecting family information without a defined purpose and appropriate consent.

## Proposed delivery sequence and decision gates

**0. Discovery and baseline.** Validate the first-time family organizer and the proposed product promise; inventory deployed version, existing users and data; reproduce backup and relationship scenarios with disposable fixtures. Establish browser support and baseline tests. Gate: documented invariants and recovery plan.

**1. Trust and correctness.** Atomic validated backups and relationship writes; fix destructive relationship reconciliation; test migrations, photos and restore; dependency and lint cleanup; correct claims. Gate: restore a representative backup into a clean browser with relationships and photos intact; failed imports leave existing data unchanged; critical flows pass CI. Decide how to communicate existing risks to any current users.

**2. Core usability.** Fix overlapping graph; build mobile focused navigation and list-to-person workflow; simplify first entry and relationship editing; address named accessibility issues. Gate: participants can create, navigate and correct a small family on mobile and desktop without assistance; keyboard and screen-reader checks and representative layout fixtures pass.

**3. Differentiation.** Choose one of stories/media, portability, or family collaboration based on research. Ship a narrow vertical slice with export and privacy behavior specified from the outset. Gate: observed repeat use and evidence that the feature solves a meaningful user problem.

**4. Broader release.** Add support, privacy explanations, incident/recovery procedures, cross-browser and physical-device checks, operational ownership and a small invited beta. If sync is chosen, conduct a dedicated threat model and security review before release. No calendar estimates are offered until the relationship and backup issues are reproduced and scoped.

## Decisions for the owner

1. **Resolved direction:** the product need not lead with device-local storage or remain entirely free; paid services can be considered later. The owner delegated the first audience decision; recommend first-time family organizers and validate that choice.
2. Should the initial release let an organizer share a read-only tree, or must relatives contribute directly? Research this before choosing a sync architecture.
3. Are there existing users or personal trees on the live deployment that require a migration and communication plan?
4. What family structures, naming conventions, languages and devices must be supported from the start?
5. What data, if any, may be hosted; what privacy, consent, portability and recovery guarantees should apply? Decide before designing accounts or sync.

## Verification and limitations

- `npm run build`: passed on the existing installed dependencies; build reports large chunk and stale browser data.
- `npm run lint`: failed, 12 errors and 5 warnings.
- `npm audit --json`: 31 advisories as above, recorded on review date; audit results and applicability change over time.
- Static review focused on storage, relationship editing, layout, routing, import/export, dependencies and documentation; it was not an exhaustive line-by-line or penetration test.
- Local browser: loaded sample, inspected tree at desktop and mobile viewport sizes, opened search and person editor, and viewed settings. No destructive operations, backup round-trip, GEDCOM import, actual user data, screen-reader run, physical device, or deployed-site validation performed.
- Screenshots in this folder are review evidence, not a complete visual regression suite. Layout appearance can vary with viewport, browser and zoom. Test the specific flows and hypotheses above before implementing remedies.
