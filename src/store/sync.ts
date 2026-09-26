import { browser } from 'wxt/browser';
import { stateSchema, type State } from './schema';
import { OpError } from './ops';

// chrome.storage.sync limits.
export const QUOTA_BYTES = 102_400;
export const QUOTA_BYTES_PER_ITEM = 8_192;
export const MAX_ITEMS = 512;

const META = 'meta';
const FOLDER = 'f:';

type Items = Record<string, unknown>;

/** One sync item per folder keeps each item under the 8 KB per-item limit. */
export function toItems(state: State): Items {
  const items: Items = { [META]: { v: state.v, rootOrder: state.rootOrder } };
  for (const [id, folder] of Object.entries(state.folders)) items[FOLDER + id] = folder;
  return items;
}

export function fromItems(items: Items): State {
  const meta = (items[META] ?? { v: 1, rootOrder: [] }) as object;
  const folders: Items = {};
  for (const [key, value] of Object.entries(items))
    if (key.startsWith(FOLDER)) folders[key.slice(FOLDER.length)] = value;
  return stateSchema.parse({ ...meta, folders });
}

/** Same size formula Chrome uses: key length + JSON length. */
const itemBytes = (key: string, value: unknown) => key.length + JSON.stringify(value).length;

export function checkQuota(items: Items) {
  const entries = Object.entries(items);
  if (entries.length > MAX_ITEMS) throw new OpError('Too many folders to sync.');
  let total = 0;
  for (const [key, value] of entries) {
    const bytes = itemBytes(key, value);
    if (bytes > QUOTA_BYTES_PER_ITEM) throw new OpError('This folder is full. Split it into subfolders.');
    total += bytes;
  }
  if (total > QUOTA_BYTES) throw new OpError('Sync storage is full.');
}

export async function loadState(): Promise<State> {
  return fromItems(await browser.storage.sync.get(null));
}

/** Writes only the items that changed between prev and next. */
export async function saveState(prev: State, next: State) {
  const before = toItems(prev);
  const after = toItems(next);
  const changed = Object.fromEntries(
    Object.entries(after).filter(([k, v]) => JSON.stringify(before[k]) !== JSON.stringify(v)),
  );
  const removed = Object.keys(before).filter((k) => !(k in after));
  if (Object.keys(changed).length) await browser.storage.sync.set(changed);
  if (removed.length) await browser.storage.sync.remove(removed);
}
