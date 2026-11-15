import { db } from './schema';
import { parseBackup, type Backup } from '../lib/backup';

/** Never mix sample records into an existing database or partially import them. */
export async function importSampleData(sample: Backup): Promise<void> {
  await db.transaction('rw', db.persons, db.families, db.trees, async () => {
    const counts = await Promise.all([db.persons.count(), db.families.count(), db.trees.count()]);
    if (counts.some(Boolean)) throw new Error('The sample can only be loaded into an empty browser. Use a separate browser profile to explore it without changing your family.');
    await db.persons.bulkAdd(sample.persons);
    await db.families.bulkAdd(sample.families);
    await db.trees.bulkAdd(sample.trees);
  });
}

export async function loadSampleData(): Promise<void> {
  const response = await fetch(new URL('../../test-data/sample-family.json', import.meta.url));
  if (!response.ok) throw new Error('Sample data could not be loaded. Please try again.');
  await importSampleData(parseBackup(await response.text()));
  // The import has already succeeded even if browser storage blocks this UI hint.
  try { localStorage.setItem('triggerAutoLayout', 'true'); } catch { /* Layout can still be arranged manually. */ }
}
