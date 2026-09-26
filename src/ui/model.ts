import { signal } from '@preact/signals';
import { browser } from 'wxt/browser';
import { OpError, createFolder, emptyState } from '../store/ops';
import type { State } from '../store/schema';
import type { Store } from '../store/store';
import { loadTitles, type TitleCache } from '../store/titles';
import { t } from './i18n';

/** Collapse key for the whole panel; folder ids are used for folders. */
export const SECTION = 'section';
const COLLAPSED_KEY = 'collapsed';

export const folders = signal<State>(emptyState());
export const titles = signal<TitleCache>({});
export const currentChat = signal<string | null>(null);
export const collapsed = signal<ReadonlySet<string>>(new Set());
export const editingId = signal<string | null>(null);
export const toast = signal<string | null>(null);

let store: Store | undefined;

export function bindStore(s: Store) {
  store = s;
  folders.value = s.get();
  return s.subscribe((v) => (folders.value = v));
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(message: string) {
  toast.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = null), 4000);
}

/** Applies a store op; invalid ops show a message instead of throwing. */
export function act(op: (s: State) => State): boolean {
  try {
    store!.update(op);
    return true;
  } catch (e) {
    if (!(e instanceof OpError)) throw e;
    showToast(t.errors[e.code]);
    return false;
  }
}

export function newFolder(parent: string | null) {
  let id = '';
  const ok = act((s) => {
    const created = createFolder(s, t.newFolder, parent);
    id = created.id;
    return created.state;
  });
  if (!ok) return;
  if (collapsed.value.has(SECTION)) toggleCollapsed(SECTION);
  if (parent && collapsed.value.has(parent)) toggleCollapsed(parent);
  editingId.value = id;
}

// Collapse state is per device (storage.local).
export async function loadCollapsed() {
  const saved = (await browser.storage.local.get(COLLAPSED_KEY))[COLLAPSED_KEY];
  collapsed.value = new Set(Array.isArray(saved) ? saved : []);
}

export function toggleCollapsed(id: string) {
  const next = new Set(collapsed.value);
  if (!next.delete(id)) next.add(id);
  collapsed.value = next;
  browser.storage.local.set({ [COLLAPSED_KEY]: [...next] }).catch(console.error);
}

/** Keeps titles in sync with the cache the scanner writes. */
export async function watchTitles() {
  titles.value = await loadTitles();
  const onChanged = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && changes.titles) titles.value = (changes.titles.newValue as TitleCache) ?? {};
  };
  browser.storage.onChanged.addListener(onChanged);
  return () => browser.storage.onChanged.removeListener(onChanged);
}
