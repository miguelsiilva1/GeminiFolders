import { isFolderId, type State } from './schema';

export type SearchResult = {
  /** Items to render. */
  show: Set<string>;
  /** Folders forced open because something inside matches. */
  open: Set<string>;
};

/** Lowercase without accents, so "estatistica" finds "Estatística". */
const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * Matches folder names and chat titles. A matching folder shows everything inside it;
 * a match inside a folder shows (and opens) the folders above it. Null when the query is blank.
 */
export function searchTree(state: State, titleOf: (id: string) => string | undefined, query: string): SearchResult | null {
  const q = normalize(query.trim());
  if (!q) return null;
  const show = new Set<string>();
  const open = new Set<string>();

  // Returns whether id or something inside it matches.
  const walk = (id: string, insideMatch: boolean): boolean => {
    if (!isFolderId(id)) {
      const match = normalize(titleOf(id) ?? '').includes(q);
      if (match || insideMatch) show.add(id);
      return match;
    }
    const folder = state.folders[id];
    if (!folder) return false;
    const self = normalize(folder.name).includes(q);
    let inner = false;
    for (const child of folder.order) inner = walk(child, insideMatch || self) || inner;
    if (self || inner || insideMatch) show.add(id);
    if (inner) open.add(id);
    return self || inner;
  };
  for (const id of state.rootOrder) walk(id, false);
  return { show, open };
}
