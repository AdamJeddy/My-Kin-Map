# Relatives and sample data — 15 November 2026

## What changed

A person's profile now offers Add parent and Add sibling alongside the existing child and partner actions. The short form asks for names first; other existing person details remain optional. When a parent will be connected to more than one child, the form explains that before saving.

Siblings can be recorded even when neither parent is known. The family tree uses a dashed sibling connection for that case; it does not create a fictitious parent. Adding a parent later connects them to all children in that family group. Two people who share children are not automatically considered partners: new co-parent-only groups are shown as such and can later be recorded as a partnership explicitly.

The sample family can only be imported into an empty browser database. The import validates the backup and writes it atomically, preventing partial imports and accidental overwrites of existing records. It is not a separate demo mode: once loaded, sample records can still be edited or mixed with real records. Use a separate browser profile for isolation.

## Rules and implementation

- `src/db/relative-creation.ts` snapshots the existing birth group before editing and rechecks its revision in the write transaction. Person creation and relationship changes succeed or roll back together.
- The current model supports at most two recorded parents in a group. The form blocks a third parent, ambiguous multiple birth groups, stale changes, and adding a parent to a group containing partnership or marriage history that could otherwise be misattributed.
- Adding a sibling to a group shares its recorded parents. Adding a parent affects every child in that group, so this flow does not model partial siblings or different parent sets within the same group.
- `Family.coParentsOnly` distinguishes a parental group from a partnership. Backup validation preserves the optional field, and explicitly recording a partnership clears it. Older versions of the application may not understand this field and may interpret such a group as a partnership; avoid restoring a new backup into an older version.
- `src/db/sample-data.ts` checks all three tables, including an otherwise empty saved tree, and imports validated records in a single transaction.

## Verification and follow-up

Automated coverage includes parentless siblings, shared parents, co-parents, stale edits and rollback, backup round trips, sample import safeguards, and tree layout. Browser checks covered mobile and desktop family profiles, adding siblings and parents, optional details, the two-parent limit, sample loading into an empty database, and the rejection of a sample import over existing family data. A fresh family with two parents was checked to confirm no partnership was invented.

The broader family model still needs explicit support for half siblings, adoptive/step relationships, and more complex parentage. The sample remains persistent rather than isolated. Consider an isolated, clearly dismissible demo and a richer relationship model before expanding these flows further.
