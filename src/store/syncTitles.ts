import { browser } from 'wxt/browser';
import { isChatId, type State } from './schema';
import { TITLE_CHUNKS, TITLE_CHUNK_BYTES, itemBytes } from './sync';
import { importTitles, type TitleCache } from './titles';

// Titles of chats in the panel are synced too, so another computer can show them before Gemini
// has loaded those chats in its sidebar. Stored as a few "t:<n>" items of { chatId: title }.
const PREFIX = 't:';
const MAX_TITLE = 100;
const SAVE_DELAY_MS = 2_000;

type Chunk = Record<string, string>;

/** Chunks of { id: title } for chats in the panel, in panel order, within the reserved quota. */
export function titleItems(state: State, titles: TitleCache): Record<string, Chunk> {
  const ids = [...state.rootOrder, ...Object.values(state.folders).flatMap((f) => f.order)].filter(isChatId);
  const items: Record<string, Chunk> = {};
  let n = 0;
  let chunk: Chunk = {};
  for (const id of ids) {
    const title = titles[id]?.title.slice(0, MAX_TITLE);
    if (!title) continue;
    const next = { ...chunk, [id]: title };
    if (itemBytes(PREFIX + n, next) > TITLE_CHUNK_BYTES) {
      items[PREFIX + n] = chunk;
      if (++n >= TITLE_CHUNKS) return items; // out of reserved space; the rest stay local
      chunk = { [id]: title };
    } else {
      chunk = next;
    }
  }
  if (Object.keys(chunk).length) items[PREFIX + n] = chunk;
  return items;
}

export function readTitleItems(items: Record<string, unknown>): TitleCache {
  const titles: TitleCache = {};
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(PREFIX) || !value || typeof value !== 'object') continue;
    for (const [id, title] of Object.entries(value))
      if (isChatId(id) && typeof title === 'string') titles[id] = { title: title.slice(0, MAX_TITLE), lastSeen: 0 };
  }
  return titles;
}

/** Writes changed chunks and removes chunks that are no longer needed. */
export async function saveTitleItems(items: Record<string, Chunk>) {
  const current = await browser.storage.sync.get(null);
  const changed = Object.fromEntries(
    Object.entries(items).filter(([k, v]) => JSON.stringify(current[k]) !== JSON.stringify(v)),
  );
  const stale = Object.keys(current).filter((k) => k.startsWith(PREFIX) && !(k in items));
  if (Object.keys(changed).length) await browser.storage.sync.set(changed);
  if (stale.length) await browser.storage.sync.remove(stale);
}

/** Pulls synced titles into this device's cache now and whenever another device changes them. */
export function watchSyncedTitles(): () => void {
  const pull = () =>
    browser.storage.sync
      .get(null)
      .then((items) => importTitles(readTitleItems(items)))
      .catch(console.error);
  const onChanged = (changes: Record<string, unknown>, area: string) => {
    if (area === 'sync' && Object.keys(changes).some((k) => k.startsWith(PREFIX))) pull();
  };
  pull();
  browser.storage.onChanged.addListener(onChanged);
  return () => browser.storage.onChanged.removeListener(onChanged);
}

/** Debounced push of panel chat titles. */
export function createTitlePusher() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = '';
  return {
    push(state: State, titles: TitleCache) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const items = titleItems(state, titles);
        const json = JSON.stringify(items);
        if (json === last) return;
        last = json;
        saveTitleItems(items).catch(console.error);
      }, SAVE_DELAY_MS);
    },
    dispose: () => clearTimeout(timer),
  };
}
