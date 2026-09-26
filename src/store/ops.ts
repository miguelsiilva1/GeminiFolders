import { MAX_DEPTH, folderSchema, isChatId, isFolderId, type State } from './schema';

export type OpCode =
  | 'nameLength'
  | 'notFound'
  | 'maxDepth'
  | 'intoSelf'
  | 'unknownItem'
  | 'folderFull'
  | 'tooManyFolders'
  | 'syncFull';

/** A user action that can't be applied; code maps to a UI message. */
export class OpError extends Error {
  constructor(readonly code: OpCode) {
    super(code);
  }
}

export const emptyState = (): State => ({ v: 1, rootOrder: [], folders: {} });

const newFolderId = () => 'F-' + crypto.randomUUID().replaceAll('-', '').slice(0, 10);

function cleanName(name: string): string {
  const parsed = folderSchema.shape.name.safeParse(name);
  if (!parsed.success) throw new OpError('nameLength');
  return parsed.data;
}

function listOf(state: State, parent: string | null): string[] {
  if (parent === null) return state.rootOrder;
  const folder = state.folders[parent];
  if (!folder) throw new OpError('notFound');
  return folder.order;
}

/** Folder containing id, null for root, undefined if id isn't placed anywhere. */
export function parentOf(state: State, id: string): string | null | undefined {
  if (state.rootOrder.includes(id)) return null;
  for (const [fid, folder] of Object.entries(state.folders)) if (folder.order.includes(id)) return fid;
  return undefined;
}

/** Root folders have depth 1. */
function depthOf(state: State, folderId: string): number {
  let depth = 1;
  for (let p = parentOf(state, folderId); p; p = parentOf(state, p)) depth++;
  return depth;
}

/** Levels of folders in the subtree rooted at folderId, including itself. */
function heightOf(state: State, folderId: string): number {
  const children = state.folders[folderId]!.order.filter(isFolderId);
  return 1 + Math.max(0, ...children.map((c) => heightOf(state, c)));
}

function isInside(state: State, id: string, ancestor: string): boolean {
  for (let p = parentOf(state, id); p; p = parentOf(state, p)) if (p === ancestor) return true;
  return false;
}

function detach(state: State, id: string) {
  const parent = parentOf(state, id);
  if (parent === undefined) return;
  const list = listOf(state, parent);
  list.splice(list.indexOf(id), 1);
}

export function createFolder(state: State, name: string, parent: string | null = null) {
  if (parent !== null && depthOf(state, parent) >= MAX_DEPTH)
    throw new OpError('maxDepth');
  const next = structuredClone(state);
  const id = newFolderId();
  listOf(next, parent).push(id);
  next.folders[id] = { name: cleanName(name), order: [] };
  return { state: next, id };
}

export function renameFolder(state: State, id: string, name: string): State {
  const next = structuredClone(state);
  const folder = next.folders[id];
  if (!folder) throw new OpError('notFound');
  folder.name = cleanName(name);
  return next;
}

/** Contents (chats and subfolders) move up to the parent in place. */
export function deleteFolder(state: State, id: string): State {
  const folder = state.folders[id];
  if (!folder) throw new OpError('notFound');
  const next = structuredClone(state);
  const parent = parentOf(next, id);
  if (parent !== undefined) {
    const list = listOf(next, parent);
    list.splice(list.indexOf(id), 1, ...folder.order);
  }
  delete next.folders[id];
  return next;
}

/**
 * Moves a chat or folder to position index of target (null = top level, where chats can sit
 * without a folder). A chat is placed in one spot at most.
 */
export function moveItem(state: State, id: string, target: string | null, index: number): State {
  if (isChatId(id)) {
    // Chats can go anywhere.
  } else if (isFolderId(id)) {
    if (!state.folders[id]) throw new OpError('notFound');
    if (target === id || (target && isInside(state, target, id)))
      throw new OpError('intoSelf');
    const targetDepth = target === null ? 0 : depthOf(state, target);
    if (targetDepth + heightOf(state, id) > MAX_DEPTH)
      throw new OpError('maxDepth');
  } else {
    throw new OpError('unknownItem');
  }
  const next = structuredClone(state);
  const list = listOf(next, target);
  detach(next, id);
  list.splice(Math.max(0, Math.min(index, list.length)), 0, id);
  return next;
}

export type DropPos = 'before' | 'after' | 'into';

/** Moves id next to targetId (same parent), or to the end of folder targetId for 'into'. */
export function moveRelative(state: State, id: string, targetId: string, pos: DropPos): State {
  if (pos === 'into') return moveItem(state, id, targetId, listOf(state, targetId).length);
  const parent = parentOf(state, targetId);
  if (parent === undefined) throw new OpError('notFound');
  const list = listOf(state, parent);
  let index = list.indexOf(targetId) + (pos === 'after' ? 1 : 0);
  // moveItem inserts after removing id, which shifts later positions left by one.
  const from = list.indexOf(id);
  if (from !== -1 && from < index) index--;
  return moveItem(state, id, parent, index);
}

/** Removes a chat from its folder, returning it to Gemini's list. */
export function unassignChat(state: State, chatId: string): State {
  const next = structuredClone(state);
  detach(next, chatId);
  return next;
}
