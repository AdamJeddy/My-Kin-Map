import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import sample from '../../test-data/sample-family.json';
import { db } from './schema';
import { importSampleData } from './sample-data';
import { parseBackup } from '../lib/backup';

const backup = () => parseBackup(JSON.stringify(sample));

beforeEach(async () => { await db.persons.clear(); await db.families.clear(); await db.trees.clear(); });

describe('sample family import', () => {
  it('loads a sample into an empty database', async () => {
    await importSampleData(backup());
    expect(await db.persons.count()).toBe(sample.persons.length);
    expect(await db.families.count()).toBe(sample.families.length);
  });
  it('never overwrites existing records, even if a sample ID matches', async () => {
    const original = { ...sample.persons[0], givenNames: 'Existing', sex: 'U' as const, createdAt: new Date(), updatedAt: new Date() };
    await db.persons.add(original);
    await expect(importSampleData(backup())).rejects.toThrow('empty');
    expect((await db.persons.get(original.id))?.givenNames).toBe('Existing');
    expect(await db.families.count()).toBe(0);
  });
  it('protects an existing tree even when there are no people', async () => {
    const tree = parseBackup(JSON.stringify(sample)).trees[0];
    await db.trees.add(tree);
    await expect(importSampleData(backup())).rejects.toThrow('empty');
    expect(await db.persons.count()).toBe(0);
    expect((await db.trees.get(tree.id))?.name).toBe(tree.name);
  });
  it('rolls back all sample records when a write fails', async () => {
    const fail = () => { throw new Error('storage failure'); };
    db.families.hook('creating', fail);
    try { await expect(importSampleData(backup())).rejects.toThrow(); }
    finally { db.families.hook('creating').unsubscribe(fail); }
    expect(await db.persons.count()).toBe(0);
    expect(await db.families.count()).toBe(0);
    expect(await db.trees.count()).toBe(0);
  });
});
