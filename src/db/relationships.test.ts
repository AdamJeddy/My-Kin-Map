import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './schema';
import { reconcileRelationships } from './relationships';
import { createPerson } from './hooks';

const date = new Date('2020-01-01');
const base = { _rev: 'rev', createdAt: date, updatedAt: date };
beforeEach(async () => {
  await db.persons.clear();
  await db.families.clear();
  await db.persons.bulkAdd(['p', 's1', 's2', 'c1', 'c2'].map(id => ({ ...base, id, givenNames: id, surname: 'Test', sex: 'U' as const })));
  await db.families.bulkAdd([
    { ...base, id: 'f1', spouse1Id: 'p', spouse2Id: 's1', childIds: ['c1'], type: 'unknown' },
    { ...base, id: 'f2', spouse1Id: 'p', spouse2Id: 's2', childIds: ['c2'], type: 'unknown' },
  ]);
});

describe('relationship reconciliation', () => {
  it('preserves children in their existing partnerships on an unchanged edit', async () => {
    await reconcileRelationships('p', { parentIds: [], spouseId: 's1', childIds: ['c1', 'c2'] });
    expect((await db.families.get('f1'))?.childIds).toEqual(['c1']);
    expect((await db.families.get('f2'))?.childIds).toEqual(['c2']);
  });
  it('rejects edits the current form cannot safely represent', async () => {
    await expect(reconcileRelationships('p', { parentIds: [], spouseId: 's1', childIds: ['c1'] })).rejects.toThrow('not yet supported');
    expect((await db.families.get('f2'))?.childIds).toEqual(['c2']);
  });
  it('rejects creating a cycle and leaves relationships intact', async () => {
    await expect(reconcileRelationships('p', { parentIds: ['c1'], spouseId: 's1', childIds: ['c1', 'c2'] })).rejects.toThrow('loop');
    expect((await db.families.get('f1'))?.childIds).toEqual(['c1']);
  });
  it('does not add a child who already has another parent group', async () => {
    await expect(reconcileRelationships('s2', { parentIds: [], spouseId: 'p', childIds: ['c1', 'c2'] })).rejects.toThrow('another family group');
    expect((await db.families.get('f2'))?.childIds).toEqual(['c2']);
  });
  it('adds a new child to the selected parents without changing another partnership', async () => {
    const child = await createPerson({ givenNames: 'New', surname: 'Child', sex: 'U' });
    await reconcileRelationships(child.id, { parentIds: ['p', 's1'], childIds: [] });
    expect((await db.families.get('f1'))?.childIds).toContain(child.id);
    expect((await db.families.get('f2'))?.childIds).toEqual(['c2']);
  });
  it('adds a partner without changing existing family groups', async () => {
    const partner = await createPerson({ givenNames: 'New', surname: 'Partner', sex: 'U' });
    await reconcileRelationships(partner.id, { parentIds: [], spouseId: 'p', childIds: [] });
    const groups = await db.families.toArray();
    expect(groups.some(f => [f.spouse1Id, f.spouse2Id].includes(partner.id) && [f.spouse1Id, f.spouse2Id].includes('p'))).toBe(true);
    expect((await db.families.get('f1'))?.childIds).toEqual(['c1']);
  });
});
