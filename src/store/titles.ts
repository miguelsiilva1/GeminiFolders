import { browser } from 'wxt/browser';
import type { ChatRef } from '../dom/scanner';

/** Chat titles are per-device (storage.local); only ids are synced. */
export type TitleCache = Record<string, { title: string; lastSeen: number }>;

const KEY = 'titles';
const DAY_MS = 86_400_000;

/** Returns the updated cache, or null when nothing worth writing changed. */
export function mergeTitles(cache: TitleCache, chats: ChatRef[], now: number): TitleCache | null {
  let next: TitleCache | null = null;
  for (const { id, title } of chats) {
    const old = cache[id];
    if (old && old.title === title && now - old.lastSeen < DAY_MS) continue;
    next ??= { ...cache };
    next[id] = { title, lastSeen: now };
  }
  return next;
}

export async function loadTitles(): Promise<TitleCache> {
  return ((await browser.storage.local.get(KEY))[KEY] as TitleCache | undefined) ?? {};
}

export async function recordTitles(chats: ChatRef[]) {
  const next = mergeTitles(await loadTitles(), chats, Date.now());
  if (next) await browser.storage.local.set({ [KEY]: next });
}

/** Adds titles from a backup; titles already seen on this device win. */
export async function importTitles(imported: TitleCache) {
  const local = await loadTitles();
  if (Object.keys(imported).some((id) => !(id in local)))
    await browser.storage.local.set({ [KEY]: { ...imported, ...local } });
}
