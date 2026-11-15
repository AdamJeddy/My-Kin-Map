import { addChildToFamily, getOrCreateFamily, getPersonWithRelations, linkParentsToChild, removeChildFromFamily } from './hooks';
import { db } from './schema';
import { v4 as uuid } from 'uuid';

export interface RelationshipSelection {
  parentIds: string[];
  spouseId?: string;
  childIds: string[];
}

/** Reconcile only explicitly changed links; never move existing children between partnerships. */
export async function reconcileRelationships(personId: string, selection: RelationshipSelection): Promise<void> {
  const current = await getPersonWithRelations(personId);
  if (!current) throw new Error('Person not found');
  const all = [...selection.parentIds, ...selection.childIds, ...(selection.spouseId ? [selection.spouseId] : [])];
  if (all.includes(personId) || new Set(selection.parentIds).size !== selection.parentIds.length || new Set(selection.childIds).size !== selection.childIds.length || selection.parentIds.length > 2) throw new Error('Invalid relationship selection');
  const people = await db.persons.bulkGet(all);
  if (people.some(person => !person || person._deleted)) throw new Error('A selected family member no longer exists');
  const families = await db.families.filter(family => !family._deleted).toArray();
  const children = new Map<string, string[]>();
  for (const family of families) for (const parent of [family.spouse1Id, family.spouse2Id]) {
    if (parent) children.set(parent, [...(children.get(parent) ?? []), ...family.childIds]);
  }
  const reaches = (start: string, target: string): boolean => {
    const seen = new Set<string>();
    const pending = [start];
    while (pending.length) {
      const id = pending.pop()!;
      if (id === target) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      pending.push(...(children.get(id) ?? []));
    }
    return false;
  };
  if (selection.parentIds.some(id => reaches(personId, id)) || selection.childIds.some(id => reaches(id, personId)) || selection.parentIds.some(id => selection.childIds.includes(id))) {
    throw new Error('This relationship would create a loop in the family tree.');
  }
  const existingSpouses = new Set(current.spouses.map(person => person.id));
  const existingChildren = new Set(current.spouseFamilies.flatMap(family => family.childIds));
  if (selection.childIds.some(id => !existingChildren.has(id) && families.some(family => family.childIds.includes(id)))) {
    throw new Error('A selected child already belongs to another family group. Update that group first.');
  }
  const currentParents = [current.birthFamily?.spouse1Id, current.birthFamily?.spouse2Id].filter(Boolean) as string[];
  const sameParents = currentParents.length === selection.parentIds.length && currentParents.every(id => selection.parentIds.includes(id));
  const sameChildren = existingChildren.size === selection.childIds.length && selection.childIds.every(id => existingChildren.has(id));
  if (existingSpouses.size > 1 && sameParents && sameChildren && selection.spouseId === current.spouses[0]?.id) return;
  if (existingSpouses.size > 1 || (existingSpouses.size === 1 && !existingSpouses.has(selection.spouseId ?? ''))) {
    throw new Error('Changing an existing partnership is not yet supported. Existing relationships were preserved.');
  }
  const desiredParents = selection.parentIds.slice(0, 2);
  if (current.birthFamily && (currentParents.length !== desiredParents.length || currentParents.some(id => !desiredParents.includes(id)))) {
    await removeChildFromFamily(current.birthFamily.id, personId);
  }
  if (desiredParents.length) await linkParentsToChild(desiredParents, personId);

  const selectedChildren = new Set(selection.childIds);
  for (const family of current.spouseFamilies) {
    for (const childId of family.childIds) if (!selectedChildren.has(childId)) await removeChildFromFamily(family.id, childId);
  }
  const newChildren = selection.childIds.filter(id => !existingChildren.has(id));
  if (newChildren.length || (selection.spouseId && !existingSpouses.has(selection.spouseId))) {
    const family = await getOrCreateFamily(personId, selection.spouseId);
    if (selection.spouseId && family.coParentsOnly) {
      await db.families.update(family.id, { coParentsOnly: false, _rev: uuid(), updatedAt: new Date() });
    }
    for (const childId of newChildren) await addChildToFamily(family.id, childId);
  }
}
