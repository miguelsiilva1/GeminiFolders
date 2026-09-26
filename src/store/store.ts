import { browser } from 'wxt/browser';
import type { State } from './schema';
import { checkQuota, loadState, saveState, toItems } from './sync';

const SAVE_DELAY_MS = 500; // sync allows ~120 writes/min

export type Store = {
  get(): State;
  /** Applies op; throws OpError (state unchanged) if it's invalid or wouldn't fit in sync storage. */
  update(op: (s: State) => State): void;
  subscribe(fn: (s: State) => void): () => void;
  dispose(): void;
};

export async function createStore(onSaveError: (e: unknown) => void = console.error): Promise<Store> {
  let state = await loadState();
  let saved = state;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<(s: State) => void>();
  const emit = () => listeners.forEach((fn) => fn(state));

  const flush = () => {
    timer = undefined;
    const next = state;
    saveState(saved, next).then(() => (saved = next), onSaveError);
  };

  // Changes from another device or tab. Local unsaved edits win.
  const onChanged = (_: unknown, area: string) => {
    if (area !== 'sync' || timer) return;
    loadState().then((s) => {
      if (timer) return;
      state = saved = s;
      emit();
    }, onSaveError);
  };
  browser.storage.onChanged.addListener(onChanged);

  return {
    get: () => state,
    update(op) {
      const next = op(state);
      checkQuota(toItems(next));
      state = next;
      emit();
      clearTimeout(timer);
      timer = setTimeout(flush, SAVE_DELAY_MS);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dispose() {
      if (timer) {
        clearTimeout(timer);
        flush();
      }
      browser.storage.onChanged.removeListener(onChanged);
    },
  };
}
