import { v4 as uuid } from 'uuid';
import { db } from './schema';

export interface FamilyGroupInput {
  familyId?: string;
  expectedRevision?: string;
  partnerId?: string;
  childIds: string[];
}

/** Save exactly one family group without modifying the person's other partnerships. */
export async function saveFamilyGroup(personId: string, input: FamilyGroupInput): Promise<void> {
  await db.transaction('rw', db.persons, db.families, async () => {
    const existing = input.familyId ? await db.families.get(input.familyId) : undefined;
    if (input.familyId && (!existing || existing._deleted || ![existing.spouse1Id, existing.spouse2Id].includes(personId))) throw new Error('Family group not found');
    if (existing && existing._rev !== input.expectedRevision) throw new Error('This family group changed. Close and reopen it to review the latest details.');
    const oldPartner = existing && (existing.spouse1Id === personId ? existing.spouse2Id : existing.spouse1Id);
    if (existing && oldPartner !== input.partnerId && (existing.type !== 'unknown' || existing.marriageDate || existing.divorceDate)) {
      throw new Error('This group has marriage or partnership details. Create a separate group to preserve its history.');
    }
    if ((!input.partnerId && input.childIds.length === 0) || input.partnerId === personId || input.childIds.includes(personId) ||
        (input.partnerId && input.childIds.includes(input.partnerId)) || new Set(input.childIds).size !== input.childIds.length) throw new Error('Choose a partner or children, and make sure each person has one role.');
    const ids = [personId, ...(input.partnerId ? [input.partnerId] : []), ...input.childIds];
    const people = await db.persons.bulkGet(ids);
    if (people.some(person => !person || person._deleted)) throw new Error('A selected family member no longer exists.');
    const families = await db.families.filter(family => !family._deleted && family.id !== input.familyId).toArray();
    if (input.childIds.some(childId => !existing?.childIds.includes(childId) && families.some(family => family.childIds.includes(childId)))) {
      throw new Error('A selected child already belongs to another family group. Update that group first.');
    }
    const duplicate = families.some(family => {
      const parents = [family.spouse1Id, family.spouse2Id].filter(Boolean);
      return parents.length === (input.partnerId ? 2 : 1) && parents.includes(personId) && (!input.partnerId || parents.includes(input.partnerId));
    });
    if (duplicate) throw new Error('A family group with this partner already exists. Edit it instead.');

    const graph = new Map<string, string[]>();
    for (const family of families) for (const parentId of [family.spouse1Id, family.spouse2Id]) {
      if (parentId) graph.set(parentId, [...(graph.get(parentId) ?? []), ...family.childIds]);
    }
    const reaches = (start: string, target: string) => {
      const pending = [start], visited = new Set<string>();
      while (pending.length) {
        const id = pending.pop()!;
        if (id === target) return true;
        if (visited.has(id)) continue;
        visited.add(id); pending.push(...(graph.get(id) ?? []));
      }
      return false;
    };
    if (input.childIds.some(childId => reaches(childId, personId) || (input.partnerId && reaches(childId, input.partnerId)))) throw new Error('This would create a loop in the family tree.');

    const now = new Date();
    if (existing) {
      const personIsFirst = existing.spouse1Id === personId;
      await db.families.update(existing.id, { spouse1Id: personIsFirst ? personId : input.partnerId, spouse2Id: personIsFirst ? input.partnerId : personId, childIds: input.childIds, updatedAt: now, _rev: uuid() });
    } else {
      await db.families.add({ id: uuid(), _rev: uuid(), createdAt: now, updatedAt: now, spouse1Id: personId, spouse2Id: input.partnerId, childIds: input.childIds, type: 'unknown' });
    }
  });
}
