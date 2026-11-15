import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './schema';
import { createPerson, getPersonWithRelations } from './hooks';
import { linkNewRelative, getBirthGroupSnapshot } from './relative-creation';
import { createBackup, parseBackup, restoreBackup } from '../lib/backup';

const base = { _rev: 'rev', createdAt: new Date('2020-01-01'), updatedAt: new Date('2020-01-01') };
beforeEach(async () => {
  await db.persons.clear(); await db.families.clear();
  await db.persons.bulkAdd(['person', 'new', 'parent', 'sibling'].map(id => ({ ...base, id, givenNames: id, surname: 'Example', sex: 'U' as const })));
});

describe('linking a new parent or sibling', () => {
  it('connects siblings without inventing parents, then adds a parent to both', async () => {
    await linkNewRelative('person', 'sibling', 'sibling', await getBirthGroupSnapshot('person'));
    expect((await getPersonWithRelations('person'))?.siblings.map(p => p.id)).toEqual(['sibling']);
    expect((await getPersonWithRelations('person'))?.parents).toEqual([]);
    await linkNewRelative('person', 'parent', 'parent', await getBirthGroupSnapshot('person'));
    expect((await getPersonWithRelations('sibling'))?.parents.map(p => p.id)).toEqual(['parent']);
  });
  it('adds a sibling to the existing parent group without changing its other members', async () => {
    await db.families.add({ ...base, id: 'family', spouse1Id: 'parent', childIds: ['person'], type: 'unknown' });
    await linkNewRelative('person', 'sibling', 'sibling', await getBirthGroupSnapshot('person'));
    expect((await db.families.get('family'))?.childIds).toEqual(['person', 'sibling']);
  });
  it('adds a second parent to the existing group and all its children', async () => {
    await db.families.add({ ...base, id: 'family', spouse1Id: 'parent', childIds: ['person', 'sibling'], type: 'unknown' });
    await linkNewRelative('person', 'new', 'parent', await getBirthGroupSnapshot('person'));
    expect((await getPersonWithRelations('sibling'))?.parents.map(p => p.id)).toEqual(['parent', 'new']);
    expect((await db.families.get('family'))?.childIds).toEqual(['person', 'sibling']);
    expect((await getPersonWithRelations('parent'))?.spouses).toEqual([]);
    expect((await getPersonWithRelations('new'))?.spouses).toEqual([]);
  });
  it('rolls back a new person if their family group changes before saving', async () => {
    const snapshot = await getBirthGroupSnapshot('person');
    await db.families.add({ ...base, id: 'family', spouse1Id: 'parent', childIds: ['person'], type: 'unknown' });
    await expect(db.transaction('rw', db.persons, db.families, async () => {
      const created = await createPerson({ givenNames: 'Rollback', surname: 'Example', sex: 'U' });
      await linkNewRelative('person', created.id, 'sibling', snapshot);
    })).rejects.toThrow('changed');
    expect((await db.persons.where('givenNames').equals('Rollback').toArray())).toHaveLength(0);
  });
  it('preserves siblings with unknown parents through backup and restore', async () => {
    await linkNewRelative('person', 'sibling', 'sibling', null);
    const backup = parseBackup(JSON.stringify(await createBackup()));
    await db.persons.clear(); await db.families.clear();
    await restoreBackup(backup);
    expect((await getPersonWithRelations('person'))?.siblings.map(p => p.id)).toEqual(['sibling']);
    expect((await getPersonWithRelations('person'))?.parents).toEqual([]);
  });
  it('preserves co-parent status through backup and restore', async () => {
    await db.families.add({ ...base, id: 'family', spouse1Id: 'parent', childIds: ['person'], type: 'unknown' });
    await linkNewRelative('person', 'new', 'parent', await getBirthGroupSnapshot('person'));
    const backup = parseBackup(JSON.stringify(await createBackup()));
    await db.persons.clear(); await db.families.clear();
    await restoreBackup(backup);
    expect((await db.families.get('family'))?.coParentsOnly).toBe(true);
    expect((await getPersonWithRelations('parent'))?.spouses).toEqual([]);
    expect((await getPersonWithRelations('person'))?.parents.map(p => p.id)).toEqual(['parent', 'new']);
  });
  it('rejects a third parent and a stale family-group edit', async () => {
    await db.families.add({ ...base, id: 'family', spouse1Id: 'parent', spouse2Id: 'sibling', childIds: ['person'], type: 'unknown' });
    const snapshot = await getBirthGroupSnapshot('person');
    await expect(linkNewRelative('person', 'new', 'parent', snapshot)).rejects.toThrow('two parents');
    await db.families.update('family', { _rev: 'changed', spouse2Id: undefined });
    await expect(linkNewRelative('person', 'new', 'parent', snapshot)).rejects.toThrow('changed');
    expect((await db.families.get('family'))?.spouse2Id).toBeUndefined();
  });
  it('rejects ambiguous multiple parent groups', async () => {
    await db.families.bulkAdd([
      { ...base, id: 'one', spouse1Id: 'parent', childIds: ['person'], type: 'unknown' },
      { ...base, id: 'two', spouse1Id: 'sibling', childIds: ['person'], type: 'unknown' },
    ]);
    await expect(getBirthGroupSnapshot('person')).rejects.toThrow('multiple');
  });
  it('does not assign recorded partnership history to a newly added parent', async () => {
    await db.families.add({ ...base, id: 'family', spouse1Id: 'parent', childIds: ['person'], type: 'married', marriageDate: { date: '2000' } });
    await expect(linkNewRelative('person', 'new', 'parent', await getBirthGroupSnapshot('person'))).rejects.toThrow('partnership details');
    expect((await db.families.get('family'))?.spouse2Id).toBeUndefined();
  });
});
