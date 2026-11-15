import { v4 as uuid } from 'uuid';
import { db } from './schema';

export interface BirthGroupSnapshot {
  id: string;
  revision: string;
  parentCount: number;
  childCount: number;
  hasPartnershipDetails: boolean;
}

/** Refuse ambiguous parent groups rather than silently choosing one. */
export async function getBirthGroupSnapshot(personId: string): Promise<BirthGroupSnapshot | null> {
  const person = await db.persons.get(personId);
  if (!person || person._deleted) throw new Error('This person no longer exists.');
  const groups = (await db.families.where('childIds').equals(personId).toArray()).filter(group => !group._deleted);
  if (groups.length > 1) throw new Error('This person has multiple parent groups. Review their family groups before adding a relative.');
  const group = groups[0];
  return group ? { id: group.id, revision: group._rev, parentCount: [group.spouse1Id, group.spouse2Id].filter(Boolean).length, childCount: group.childIds.length,
    hasPartnershipDetails: group.type !== 'unknown' || !!group.marriageDate || !!group.divorceDate } : null;
}

/** Called inside the person creation transaction; a new person cannot already have other relationships. */
export async function linkNewRelative(personId: string, newPersonId: string, type: 'parent' | 'sibling', expected: BirthGroupSnapshot | null): Promise<void> {
  await db.transaction('rw', db.persons, db.families, async () => {
    const current = await getBirthGroupSnapshot(personId);
    if (current?.id !== expected?.id || current?.revision !== expected?.revision) throw new Error('This family group changed. Close and reopen the form to review it.');
    const relative = await db.persons.get(newPersonId);
    if (!relative || relative._deleted || newPersonId === personId) throw new Error('The new relative could not be found.');
    if ((await db.families.where('childIds').equals(newPersonId).toArray()).some(group => !group._deleted)) throw new Error('The new person already belongs to a parent group.');
    if (type === 'parent' && current && current.parentCount >= 2) throw new Error('This family group already has two parents.');
    if (type === 'parent' && current?.hasPartnershipDetails) throw new Error('This group has recorded partnership details. Review the family group before adding a parent.');
    const now = new Date();
    if (!current) {
      await db.families.add({ id: uuid(), _rev: uuid(), createdAt: now, updatedAt: now, type: 'unknown',
        spouse1Id: type === 'parent' ? newPersonId : undefined, childIds: type === 'sibling' ? [personId, newPersonId] : [personId] });
    } else if (type === 'sibling') {
      const group = await db.families.get(current.id);
      if (!group) throw new Error('This family group no longer exists.');
      await db.families.update(group.id, { childIds: [...group.childIds, newPersonId], updatedAt: now, _rev: uuid() });
    } else {
      const group = await db.families.get(current.id);
      if (!group) throw new Error('This family group no longer exists.');
      await db.families.update(group.id, { ...(group.spouse1Id ? { spouse2Id: newPersonId } : { spouse1Id: newPersonId }),
        coParentsOnly: current.parentCount === 1 ? true : group.coParentsOnly, updatedAt: now, _rev: uuid() });
    }
  });
}
