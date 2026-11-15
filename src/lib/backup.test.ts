import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import { createBackup, parseBackup, restoreBackup } from './backup';

const now = new Date('2020-01-01T00:00:00.000Z');
const person = { id: 'p1', _rev: 'r1', createdAt: now, updatedAt: now, givenNames: 'Ada', surname: 'Example', sex: 'F' as const };

beforeEach(async () => {
  await db.persons.clear();
  await db.families.clear();
  await db.trees.clear();
});

describe('backup and restore', () => {
  it('round trips family links and image bytes and type', async () => {
    const bytes = new Uint8Array(300_000).fill(123);
    await db.persons.add({ ...person, photo: new Blob([bytes], { type: 'image/jpeg' }) });
    await db.families.add({ id: 'f1', _rev: 'r1', createdAt: now, updatedAt: now, spouse1Id: 'p1', childIds: [], type: 'unknown' });
    const backup = await createBackup();
    await db.persons.clear();
    await db.families.clear();
    await restoreBackup(parseBackup(JSON.stringify(backup)));
    const restored = await db.persons.get('p1');
    expect(restored?.photo?.type).toBe('image/jpeg');
    expect(new Uint8Array(await restored!.photo!.arrayBuffer())).toEqual(bytes);
    expect((await db.families.get('f1'))?.spouse1Id).toBe('p1');
  }, 15000);

  it('rejects malformed records before existing data changes', async () => {
    await db.persons.add(person);
    expect(() => parseBackup(JSON.stringify({ version: 1, persons: [person, { id: 'bad' }], families: [], trees: [] }))).toThrow();
    expect(await db.persons.toArray()).toEqual([person]);
  });

  it('rejects broken links without overwriting the current data', async () => {
    await db.persons.add(person);
    const backup = parseBackup(JSON.stringify({ version: 1, persons: [{ ...person, givenNames: 'Changed' }], families: [{ id: 'f', _rev: 'r', createdAt: now, updatedAt: now, spouse1Id: 'missing', childIds: [], type: 'unknown' }], trees: [] }));
    await expect(restoreBackup(backup)).rejects.toThrow('missing family member');
    expect((await db.persons.get('p1'))?.givenNames).toBe('Ada');
  });

  it('rolls back all stores when a write fails', async () => {
    await db.persons.add(person);
    const backup = parseBackup(JSON.stringify({ version: 1, persons: [{ ...person, givenNames: 'Changed' }], families: [], trees: [] }));
    const failure = () => { throw new Error('storage failure'); };
    db.families.hook('creating', failure);
    backup.families.push({ id: 'f1', _rev: 'r', createdAt: now, updatedAt: now, spouse1Id: 'p1', childIds: [], type: 'unknown' });
    await expect(restoreBackup(backup)).rejects.toThrow();
    db.families.hook('creating').unsubscribe(failure);
    expect((await db.persons.get('p1'))?.givenNames).toBe('Ada');
  });
});
