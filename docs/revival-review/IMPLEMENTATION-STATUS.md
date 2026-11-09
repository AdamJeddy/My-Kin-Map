# Revival implementation status

14 November 2026. Work is on `feature/revival-foundations`. The accompanying report is the original review; this file records changes made afterward.

## Completed in the first increment

- JSON backups are validated before import, record links are checked against the merged database, and restoration runs in one IndexedDB transaction. Existing version 1 backups remain accepted; new backups preserve photo MIME types and handle large photos in chunks. Restore remains a merge that overwrites matching IDs.
- Person details, photo and relationship changes save in one transaction. Existing children are no longer copied between partnerships on an unchanged edit. The current editor rejects changes it cannot safely express for people with multiple partners or a changed existing partner; unchanged personal details may still be saved. Ancestry cycles and missing selected people are rejected. A dedicated relationship editor remains necessary.
- Tree layout reserves realistic space for couple cards, re-arranges after topology changes and supports dragging the canvas on mobile. The supplied sample was visually checked in desktop and mobile browser viewports. Mobile fit-to-view is still too small for comfortable exploration; a focused person/family view is a next step.
- Search has an accessible field name and space at the bottom to reduce overlap with the floating add button. On mobile the tree links to the people list; selecting a person opens a navigable family profile with an explicit edit action. Profiles list partners and children separately so aggregated children are not incorrectly assigned to each partnership. README backup guidance now describes the actual local-storage risk.
- Automated tests cover backup round trips, invalid records, broken references, transaction rollback, relationship preservation and cycles, and sample layout geometry in both orientations and viewport modes.

## Remaining before a public beta

1. Design and build a relationship editor that handles multiple partnerships, single-parent transitions, removal and different parent-child relationships without ambiguity. Add browser-level tests for these scenarios and migrations for any schema changes.
2. Improve the focused mobile family view and first-person onboarding; conduct physical-device, screen-reader, keyboard and large-text testing. The sample profile-navigation path was checked in an emulated viewport, not on a physical device.
3. Exercise backup download/restore through real browsers, with legacy backups, large photos, quota failures and cross-device transfers. Review validation against real existing data before release; legacy backups with broken links may be rejected and need a recovery route.
4. Resolve existing GEDCOM lint errors and warnings; decide whether to expose and test GEDCOM import/export. Triage dependency advisories and upgrade in compatible batches. A broad `npm update` attempt was interrupted after failing to finish promptly; do not assume dependencies were upgraded or advisories resolved.
5. Review privacy claims, hosting and service-worker behavior, confirm existing deployment/users, and define beta support and recovery. Interview first-time family organizers before choosing sharing, accounts or pricing.

The current test suite does not establish accessibility, security, production readiness, compatibility with every browser or correctness for every family structure. No deployment or migration of existing user data was performed.
