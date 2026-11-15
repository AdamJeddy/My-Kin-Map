import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, initializeSettings } from './schema';

describe('settings initialization', () => {
  beforeEach(async () => { await db.settings.clear(); });

  it('safely initializes settings when multiple callers start together', async () => {
    const results = await Promise.all([initializeSettings(), initializeSettings(), initializeSettings()]);
    expect(results.map(settings => settings.id)).toEqual(['user-settings', 'user-settings', 'user-settings']);
    expect(await db.settings.count()).toBe(1);
  });

  it('preserves existing preferences', async () => {
    await db.settings.add({ id: 'user-settings', layoutOrientation: 'horizontal', theme: 'dark', hasSeenInstallPrompt: true });
    expect((await initializeSettings()).theme).toBe('dark');
    expect((await db.settings.get('user-settings'))?.layoutOrientation).toBe('horizontal');
  });
});
