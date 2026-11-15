import { db } from '../db/schema';
import type { Family, FamilyTree, Person } from '../types';

export interface Backup {
  persons: Person[];
  families: Family[];
  trees: FamilyTree[];
}

type RecordValue = Record<string, unknown>;

function object(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid backup record');
  return value as RecordValue;
}

function requiredString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function datePlace(value: unknown): boolean {
  if (value === undefined) return true;
  const record = object(value);
  return optionalString(record.date) && optionalString(record.place) &&
    (record.placeCoordinates === undefined || (Array.isArray(record.placeCoordinates) && record.placeCoordinates.length === 2 && record.placeCoordinates.every(item => typeof item === 'number' && Number.isFinite(item))));
}

function records(value: unknown): RecordValue[] {
  if (!Array.isArray(value)) throw new Error('Invalid backup collection');
  const result = value.map(object);
  const ids = new Set<string>();
  for (const record of result) {
    if (!requiredString(record.id) || !requiredString(record._rev) || ids.has(record.id)) throw new Error('Invalid or duplicate record ID');
    if (record._deleted !== undefined && typeof record._deleted !== 'boolean') throw new Error('Invalid deletion status');
    ids.add(record.id);
    if (typeof record.createdAt !== 'string' || Number.isNaN(Date.parse(record.createdAt)) ||
        typeof record.updatedAt !== 'string' || Number.isNaN(Date.parse(record.updatedAt))) throw new Error('Invalid record date');
  }
  return result;
}

function decodePhoto(value: unknown, mime: unknown): Blob | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || (mime !== undefined && typeof mime !== 'string')) throw new Error('Invalid photo');
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new Blob([bytes], { type: typeof mime === 'string' ? mime : '' });
}

export function parseBackup(text: string): Backup {
  const data = object(JSON.parse(text));
  if (data.version !== 1) throw new Error('Unsupported backup version');
  const persons = records(data.persons).map(record => {
    if (typeof record.givenNames !== 'string' || typeof record.surname !== 'string' || !['M', 'F', 'U'].includes(String(record.sex)) ||
        !optionalString(record.birthName) || !optionalString(record.notes) || !datePlace(record.birth) || !datePlace(record.death) ||
        (record.customFields !== undefined && (!record.customFields || typeof record.customFields !== 'object' || Array.isArray(record.customFields)))) throw new Error('Invalid person');
    return { ...record, photo: decodePhoto(record.photo, record.photoType), photoThumbnail: undefined,
      createdAt: new Date(record.createdAt as string), updatedAt: new Date(record.updatedAt as string) } as unknown as Person;
  });
  const families = records(data.families ?? []).map(record => {
    if (!Array.isArray(record.childIds) || !record.childIds.every(requiredString) ||
        !['married', 'partnership', 'unknown'].includes(String(record.type)) ||
        (record.coParentsOnly !== undefined && typeof record.coParentsOnly !== 'boolean') ||
        (record.spouse1Id !== undefined && !requiredString(record.spouse1Id)) ||
        (record.spouse2Id !== undefined && !requiredString(record.spouse2Id)) || !datePlace(record.marriageDate) || !datePlace(record.divorceDate)) throw new Error('Invalid family');
    return { ...record, createdAt: new Date(record.createdAt as string), updatedAt: new Date(record.updatedAt as string) } as unknown as Family;
  });
  const trees = records(data.trees ?? []).map(record => {
    if (typeof record.name !== 'string' || !optionalString(record.description) || (record.rootPersonId !== undefined && !requiredString(record.rootPersonId))) throw new Error('Invalid tree');
    return { ...record, createdAt: new Date(record.createdAt as string), updatedAt: new Date(record.updatedAt as string) } as unknown as FamilyTree;
  });
  return { persons, families, trees };
}

async function encodePhoto(photo: Blob): Promise<string> {
  const bytes = new Uint8Array(await photo.arrayBuffer());
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  return btoa(chunks.join(''));
}

export async function createBackup() {
  const { persons, families, trees } = await db.transaction('r', db.persons, db.families, db.trees, async () => ({
    persons: await db.persons.toArray(), families: await db.families.toArray(), trees: await db.trees.toArray(),
  }));
  return {
    version: 1, exportDate: new Date().toISOString(),
    persons: await Promise.all(persons.map(async person => ({ ...person,
      photo: person.photo ? await encodePhoto(person.photo) : undefined,
      photoType: person.photo?.type || undefined, photoThumbnail: undefined,
    }))),
    families, trees,
  };
}

export async function restoreBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', db.persons, db.families, db.trees, async () => {
    const existingIds = new Set(await db.persons.toCollection().primaryKeys());
    backup.persons.forEach(person => existingIds.add(person.id));
    for (const family of backup.families) {
      if ([family.spouse1Id, family.spouse2Id, ...family.childIds].some(id => id && !existingIds.has(id))) throw new Error('Backup contains a missing family member');
    }
    if (backup.trees.some(tree => tree.rootPersonId && !existingIds.has(tree.rootPersonId))) throw new Error('Backup contains a missing tree root');
    await db.persons.bulkPut(backup.persons);
    await db.families.bulkPut(backup.families);
    await db.trees.bulkPut(backup.trees);
  });
}
