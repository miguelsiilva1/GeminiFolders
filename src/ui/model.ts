import { computed, signal } from '@preact/signals';
import { browser } from 'wxt/browser';
import { MAX_BACKUP_BYTES, createBackup, parseBackup } from '../store/backup';
import { OpError, createFolder, emptyState } from '../store/ops';
import type { State } from '../store/schema';
import { searchTree } from '../store/search';
import type { Store } from '../store/store';
import { importTitles, loadTitles, type TitleCache } from '../store/titles';
import { t } from './i18n';

/** Collapse key for the whole panel; folder ids are used for folders. */
export const SECTION = 'section';
const COLLAPSED_KEY = 'collapsed';
const HIDE_KEY = 'hideOrganized';

export const folders = signal<State>(emptyState());
export const titles = signal<TitleCache>({});
export const currentChat = signal<string | null>(null);
export const collapsed = signal<ReadonlySet<string>>(new Set());
export const editingId = signal<string | null>(null);
export const toast = signal<string | null>(null);
export const query = signal('');
export const searchResult = computed(() =>
  searchTree(folders.value, (id) => titles.value[id]?.title, query.value),
);
/** Hide chats that are in the panel from Gemini's Recent list (per device). */
export const hideOrganized = signal(false);

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

// View preferences are per device (storage.local).
export async function loadPrefs() {
  const saved = await browser.storage.local.get([COLLAPSED_KEY, HIDE_KEY]);
  const ids = saved[COLLAPSED_KEY];
  collapsed.value = new Set(Array.isArray(ids) ? ids : []);
  hideOrganized.value = saved[HIDE_KEY] === true;
}

export function toggleHideOrganized() {
  hideOrganized.value = !hideOrganized.value;
  browser.storage.local.set({ [HIDE_KEY]: hideOrganized.value }).catch(console.error);
}

export function exportBackup() {
  const json = JSON.stringify(createBackup(folders.value, titles.value), null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `gemini-folders-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Replaces the panel with a backup file's contents. */
export async function importBackup(file: File) {
  const backup = file.size <= MAX_BACKUP_BYTES ? parseBackup(await file.text()) : null;
  if (!backup) return showToast(t.invalidBackup);
  if (!act(() => backup.state)) return;
  await importTitles(backup.titles);
  showToast(t.imported);
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
