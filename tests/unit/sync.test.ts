import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { OpError, createFolder, emptyState, moveItem } from '../../src/store/ops';
import type { State } from '../../src/store/schema';
import { checkQuota, fromItems, loadState, saveState, toItems } from '../../src/store/sync';
import { createStore } from '../../src/store/store';

const chat = (n: number) => n.toString(16).padStart(16, '0');

function build(folders: number, chatsPerFolder: number): State {
  let s = emptyState();
  let n = 0;
  for (let f = 0; f < folders; f++) {
    const c = createFolder(s, `Folder ${f}`);
    s = c.state;
    for (let i = 0; i < chatsPerFolder; i++) s = moveItem(s, chat(n++), c.id, i);
  }
  return s;
}

beforeEach(() => fakeBrowser.reset());

describe('sync storage', () => {
  it('round-trips through storage items', async () => {
    const s = build(3, 4);
    expect(fromItems(toItems(s))).toEqual(s);
    await saveState(emptyState(), s);
    expect(await loadState()).toEqual(s);
  });

  it('loads an empty state on first run', async () => {
    expect(await loadState()).toEqual(emptyState());
  });

  it('only writes changed items and removes deleted folders', async () => {
    const a = build(2, 1);
    await saveState(emptyState(), a);
    const set = vi.spyOn(fakeBrowser.storage.sync, 'set');
    const remove = vi.spyOn(fakeBrowser.storage.sync, 'remove');
    const [f0, f1] = a.rootOrder as [string, string];
    const b = moveItem(a, chat(99), f0, 0);
    delete b.folders[f1];
    b.rootOrder = [f0];
    await saveState(a, b);
    expect(Object.keys(set.mock.calls[0]![0] as object).sort()).toEqual(['f:' + f0, 'meta']);
    expect(remove).toHaveBeenCalledWith(['f:' + f1]);
    expect(await loadState()).toEqual(b);
  });

  it('rejects corrupted data', () => {
    expect(() => fromItems({ meta: { v: 1, rootOrder: ['<script>'] } })).toThrow();
  });

  it('fits 2000 chats in 20 folders', () => {
    expect(() => checkQuota(toItems(build(20, 100)))).not.toThrow();
  });

  it('rejects a folder over the 8 KB item limit', () => {
    expect(() => checkQuota(toItems(build(1, 500)))).toThrow(OpError);
  });
});

describe('store', () => {
  it('debounces saves and leaves state unchanged on invalid ops', async () => {
    vi.useFakeTimers();
    const store = await createStore();
    const set = vi.spyOn(fakeBrowser.storage.sync, 'set');
    let id = '';
    store.update((s) => {
      const c = createFolder(s, 'A');
      id = c.id;
      return c.state;
    });
    store.update((s) => moveItem(s, chat(1), id, 0));
    store.update((s) => moveItem(s, chat(2), id, 1));
    expect(() => store.update((s) => moveItem(s, id, id, 0))).toThrow(OpError);
    expect(store.get().folders[id]!.order).toEqual([chat(1), chat(2)]);
    expect(set).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(600);
    expect(set).toHaveBeenCalledTimes(1);
    expect(await loadState()).toEqual(store.get());
    store.dispose();
    vi.useRealTimers();
  });
});
