# First family explorer

15 November 2026. This increment builds on the merged revival foundation.

## What changed

- On mobile, the Tree page opens on a person-focused Family view. A person selector, relationship links and a back action make it possible to move through immediate family members without zooming the full graph. The Tree control switches to the existing canvas; switching back preserves the current selection during the visit.
- Once the first person is created, the mobile view points to the existing child and partner actions. Desktop shows an unobtrusive prompt to open the first person's profile and add a connection. These actions use the existing person editor and relationship rules; they do not introduce a new family model or automatic parent inference.
- The focused view reloads relationships when family data changes, ignores late responses after navigation, and offers a retry when loading fails. It uses the same profile and family group editor as the rest of the app.

## Verification

- In a 390 × 844 emulated mobile browser, created a first person and a child, verified the preselected parent and relationship, navigated to the child and back, switched between Family and Tree, and confirmed the selected person remained selected.
- In a desktop browser, created a first person and followed the new connection prompt into their profile. Checked the prompt did not cover the canvas controls.
- Exported a disposable two-person family and restored it into an empty database on a different local browser origin. Both people and the parent-child relationship appeared. Separately exported a person with a small PNG and restored it into another empty local origin; the photo appeared on the restored profile.
- These are local browser-origin checks, not cross-device or cross-browser tests. Large photos, older backups, storage quota failures, physical-device interactions and assistive technology still need direct verification. Existing automated backup tests cover image bytes and MIME type, invalid data and rollback.

## Follow-up

- Test with beginners and on physical phones, including screen-reader, keyboard and large-text use. Decide whether selecting a person should persist across visits and how best to choose an initial focus for large trees.
- Adding a parent or sibling still uses the existing general editing and family-group flows; no new one-tap parent creation is included. Support for complex family structures and multi-parent groups remains limited.
- Add repeatable browser-level tests for first-run creation, view switching, relationship navigation and backup recovery. Continue dependency and lint triage described in [HANDOVER.md](HANDOVER.md).
