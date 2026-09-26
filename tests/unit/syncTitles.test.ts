import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createFolder, emptyState, moveItem } from '../../src/store/ops';
import { TITLE_CHUNKS, TITLE_CHUNK_BYTES, checkQuota, itemBytes, toItems } from '../../src/store/sync';
import { readTitleItems, saveTitleItems, titleItems } from '../../src/store/syncTitles';
import { importTitles, loadTitles } from '../../src/store/titles';

const chat = (n: number) => n.toString(16).padStart(16, '0');

function panelWith(count: number) {
  const f = createFolder(emptyState(), 'F');
  let s = f.state;
  const titles: Record<string, { title: string; lastSeen: number }> = {};
  for (let i = 0; i < count; i++) {
    s = moveItem(s, chat(i), i % 2 ? f.id : null, i);
    titles[chat(i)] = { title: `Chat number ${i} `.repeat(3), lastSeen: 1 };
  }
  return { s, titles };
}

beforeEach(() => fakeBrowser.reset());

describe('title sync', () => {
  it('syncs only titles of chats in the panel, truncated to 100 chars', () => {
    const { s, titles } = panelWith(2);
    titles[chat(99)] = { title: 'Not in the panel', lastSeen: 1 };
    titles[chat(0)] = { title: 'x'.repeat(300), lastSeen: 1 };
    const synced = readTitleItems(titleItems(s, titles));
    expect(Object.keys(synced).sort()).toEqual([chat(0), chat(1)]);
    expect(synced[chat(0)]!.title).toHaveLength(100);
  });

  it('stays within the reserved chunks however many chats there are', () => {
    const { s, titles } = panelWith(2000);
    const items = titleItems(s, titles);
    expect(Object.keys(items).length).toBeLessThanOrEqual(TITLE_CHUNKS);
    for (const [k, v] of Object.entries(items)) expect(itemBytes(k, v)).toBeLessThanOrEqual(TITLE_CHUNK_BYTES);
  });

  it('leaves folder storage within the quota next to full title chunks', () => {
    const { s } = panelWith(300);
    expect(() => checkQuota(toItems(s))).not.toThrow();
  });

  it('writes changed chunks, removes stale ones, and never touches folder items', async () => {
    await fakeBrowser.storage.sync.set({ meta: { v: 1, rootOrder: [] }, 't:0': { old: 'x' }, 't:3': { old: 'y' } });
    const { s, titles } = panelWith(2);
    await saveTitleItems(titleItems(s, titles));
    const all = await fakeBrowser.storage.sync.get(null);
    expect(Object.keys(all).sort()).toEqual(['meta', 't:0']);
    expect(readTitleItems(all)[chat(1)]).toBeDefined();
  });

  it('ignores malformed synced data', () => {
    expect(readTitleItems({ 't:0': { '<script>': 'x', [chat(1)]: 5, [chat(2)]: 'ok' }, 't:1': 'nope' })).toEqual({
      [chat(2)]: { title: 'ok', lastSeen: 0 },
    });
  });

  it('fills missing titles on this device without overwriting ones seen here', async () => {
    await fakeBrowser.storage.local.set({ titles: { [chat(1)]: { title: 'Seen here', lastSeen: 5 } } });
    await importTitles({
      [chat(1)]: { title: 'From sync', lastSeen: 0 },
      [chat(2)]: { title: 'Only in sync', lastSeen: 0 },
    });
    const local = await loadTitles();
    expect(local[chat(1)]!.title).toBe('Seen here');
    expect(local[chat(2)]!.title).toBe('Only in sync');
  });
});
