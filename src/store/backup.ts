import { z } from 'zod';
import { CHAT_ID, MAX_DEPTH, isFolderId, stateSchema, type State } from './schema';
import type { TitleCache } from './titles';

export const MAX_BACKUP_BYTES = 1_000_000;

const backupSchema = z.object({
  app: z.literal('GeminiFolders'),
  version: z.literal(1),
  exportedAt: z.string().max(40),
  state: stateSchema,
  titles: z
    .record(z.string().regex(CHAT_ID), z.object({ title: z.string().max(500), lastSeen: z.number() }))
    .default({}),
});

export type Backup = z.infer<typeof backupSchema>;

export function createBackup(state: State, titles: TitleCache, now = new Date()): Backup {
  const used = new Set([...state.rootOrder, ...Object.values(state.folders).flatMap((f) => f.order)]);
  return {
    app: 'GeminiFolders',
    version: 1,
    exportedAt: now.toISOString(),
    state,
    titles: Object.fromEntries(Object.entries(titles).filter(([id]) => used.has(id))),
  };
}

/**
 * The schema checks shapes; this checks the tree: every folder placed exactly once and reachable
 * from the top level (no cycles), no item listed twice, nesting within MAX_DEPTH.
 */
function isValidTree(state: State): boolean {
  const seen = new Set<string>();
  const walk = (ids: string[], depth: number): boolean =>
    ids.every((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      if (!isFolderId(id)) return true;
      const folder = state.folders[id];
      return !!folder && depth <= MAX_DEPTH && walk(folder.order, depth + 1);
    });
  return walk(state.rootOrder, 1) && Object.keys(state.folders).every((id) => seen.has(id));
}

/** Parses an exported file; null if it isn't a valid backup. */
export function parseBackup(text: string): Backup | null {
  if (text.length > MAX_BACKUP_BYTES) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = backupSchema.safeParse(json);
  return parsed.success && isValidTree(parsed.data.state) ? parsed.data : null;
}
