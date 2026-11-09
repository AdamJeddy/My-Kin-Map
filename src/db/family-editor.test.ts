import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './schema';
import { saveFamilyGroup } from './family-editor';

const date = new Date('2020-01-01');
const base = { _rev: 'rev', createdAt: date, updatedAt: date };
beforeEach(async () => {
  await db.persons.clear(); await db.families.clear();
  await db.persons.bulkAdd(['p', 'a', 'b', 'x', 'y', 'z'].map(id => ({ ...base, id, givenNames: id, surname: 'Test', sex: 'U' as const })));
  await db.families.bulkAdd([
    { ...base, id: 'f1', spouse1Id: 'p', spouse2Id: 'a', childIds: ['x'], type: 'unknown' },
    { ...base, id: 'f2', spouse1Id: 'p', spouse2Id: 'b', childIds: ['y'], type: 'unknown' },
  ]);
});

describe('family group editing', () => {
  it('updates one partnership without changing another', async () => {
    await saveFamilyGroup('p', { familyId: 'f1', expectedRevision: 'rev', partnerId: 'a', childIds: [] });
    expect((await db.families.get('f1'))?.childIds).toEqual([]);
    expect((await db.families.get('f2'))?.childIds).toEqual(['y']);
  });
  it('creates a separate family for a different partner', async () => {
    await saveFamilyGroup('a', { partnerId: 'b', childIds: ['z'] });
    expect((await db.families.toArray()).some(f => f.spouse1Id === 'a' && f.spouse2Id === 'b' && f.childIds.includes('z'))).toBe(true);
    expect((await db.families.get('f1'))?.childIds).toEqual(['x']);
  });
  it('rejects duplicate partnerships and ancestry cycles', async () => {
    await expect(saveFamilyGroup('p', { partnerId: 'a', childIds: [] })).rejects.toThrow('already exists');
    await expect(saveFamilyGroup('x', { familyId: undefined, childIds: ['p'] })).rejects.toThrow('loop');
    expect(await db.families.count()).toBe(2);
  });
  it('cannot edit a family unrelated to the selected person', async () => {
    await expect(saveFamilyGroup('x', { familyId: 'f1', childIds: [] })).rejects.toThrow();
    expect((await db.families.get('f1'))?.childIds).toEqual(['x']);
  });
  it('preserves recorded marriage information when a partner is changed', async () => {
    await db.families.update('f1', { type: 'married', marriageDate: { date: '2000' } });
    await expect(saveFamilyGroup('p', { familyId: 'f1', expectedRevision: 'rev', childIds: ['x'] })).rejects.toThrow('marriage');
    expect((await db.families.get('f1'))?.marriageDate?.date).toBe('2000');
  });
  it('rejects a stale edit instead of overwriting a newer change', async () => {
    await db.families.update('f1', { _rev: 'newer', childIds: [] });
    await expect(saveFamilyGroup('p', { familyId: 'f1', expectedRevision: 'rev', partnerId: 'a', childIds: ['x'] })).rejects.toThrow('changed');
    expect((await db.families.get('f1'))?.childIds).toEqual([]);
  });
  it('does not silently assign a child to a second parent group', async () => {
    await expect(saveFamilyGroup('a', { partnerId: 'b', childIds: ['x'] })).rejects.toThrow('another family group');
    expect((await db.families.get('f1'))?.childIds).toEqual(['x']);
  });
  it('preserves partner order when editing from the second partner', async () => {
    await saveFamilyGroup('a', { familyId: 'f1', expectedRevision: 'rev', partnerId: 'p', childIds: ['x'] });
    const group = await db.families.get('f1');
    expect([group?.spouse1Id, group?.spouse2Id]).toEqual(['p', 'a']);
  });
});
