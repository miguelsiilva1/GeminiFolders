import { describe, expect, it } from 'vitest';
import {
  OpError,
  createFolder,
  deleteFolder,
  emptyState,
  moveItem,
  parentOf,
  renameFolder,
  unassignChat,
} from '../../src/store/ops';

const chat = (n: number) => n.toString(16).padStart(16, '0');

function tree() {
  let s = emptyState();
  const a = createFolder(s, 'A');
  const b = createFolder(a.state, 'B');
  const a1 = createFolder(b.state, 'A1', a.id);
  s = moveItem(a1.state, chat(1), a.id, 0);
  s = moveItem(s, chat(2), a1.id, 0);
  return { s, a: a.id, b: b.id, a1: a1.id };
}

describe('folder ops', () => {
  it('creates, renames and trims names', () => {
    const { state, id } = createFolder(emptyState(), '  Work  ');
    expect(state.rootOrder).toEqual([id]);
    expect(renameFolder(state, id, 'Uni').folders[id]!.name).toBe('Uni');
    expect(state.folders[id]!.name).toBe('Work');
  });

  it('rejects empty and overlong names', () => {
    expect(() => createFolder(emptyState(), '   ')).toThrow(OpError);
    expect(() => createFolder(emptyState(), 'x'.repeat(81))).toThrow(OpError);
  });

  it('does not mutate the input state', () => {
    const { s, a } = tree();
    const snapshot = structuredClone(s);
    moveItem(s, chat(1), a, 5);
    deleteFolder(s, a);
    expect(s).toEqual(snapshot);
  });

  it('keeps a chat in only one folder', () => {
    const { s, a, b } = tree();
    const next = moveItem(s, chat(1), b, 0);
    expect(next.folders[a]!.order).not.toContain(chat(1));
    expect(next.folders[b]!.order).toEqual([chat(1)]);
  });

  it('reorders within a folder', () => {
    const { s, a } = tree();
    let next = moveItem(s, chat(3), a, 99); // clamps to end
    expect(next.folders[a]!.order.at(-1)).toBe(chat(3));
    next = moveItem(next, chat(3), a, 0);
    expect(next.folders[a]!.order[0]).toBe(chat(3));
  });

  it('lets chats sit at the top level and move between top level and folders', () => {
    const { s, a, b } = tree();
    const loose = moveItem(s, chat(1), null, 1); // between A and B
    expect(loose.rootOrder).toEqual([a, chat(1), b]);
    expect(loose.folders[a]!.order).not.toContain(chat(1));
    expect(parentOf(moveItem(loose, chat(1), b, 0), chat(1))).toBe(b);
  });

  it('refuses moving a folder into itself or a descendant', () => {
    const { s, a, a1 } = tree();
    expect(() => moveItem(s, a, a, 0)).toThrow(OpError);
    expect(() => moveItem(s, a, a1, 0)).toThrow(OpError);
  });

  it('enforces max depth 3 on create and move', () => {
    const { s, a, a1, b } = tree();
    const deep = createFolder(s, 'A1x', a1); // depth 3
    expect(() => createFolder(deep.state, 'too deep', deep.id)).toThrow(OpError);
    // A has height 3 now, so it can't go under B.
    expect(() => moveItem(deep.state, a, b, 0)).toThrow(OpError);
  });

  it('delete moves chats and subfolders up in place, keeping them in the panel', () => {
    const { s, a, a1, b } = tree();
    const inner = deleteFolder(s, a1);
    expect(inner.folders[a]!.order).toEqual([chat(1), chat(2)]);
    const outer = deleteFolder(s, a);
    expect(outer.rootOrder).toEqual([chat(1), a1, b]);
    expect(parentOf(outer, chat(2))).toBe(a1);
  });

  it('unassigns a chat', () => {
    const { s } = tree();
    expect(parentOf(unassignChat(s, chat(1)), chat(1))).toBeUndefined();
  });
});
