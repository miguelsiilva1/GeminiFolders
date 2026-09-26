import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup } from '../../src/store/backup';
import { createFolder, emptyState, moveItem } from '../../src/store/ops';
import { searchTree } from '../../src/store/search';

const chat = (n: number) => n.toString(16).padStart(16, '0');

function sample() {
  const uni = createFolder(emptyState(), 'Faculdade');
  const stats = createFolder(uni.state, 'Estatística', uni.id);
  const work = createFolder(stats.state, 'Trabalho');
  let s = moveItem(work.state, chat(1), stats.id, 0);
  s = moveItem(s, chat(2), work.id, 0);
  s = moveItem(s, chat(3), null, 0);
  const titles: Record<string, string> = { [chat(1)]: 'Regressão linear', [chat(2)]: 'Orçamento', [chat(3)]: 'Carreira' };
  return { s, uni: uni.id, stats: stats.id, work: work.id, titles };
}

describe('searchTree', () => {
  it('returns null for a blank query', () => {
    const { s, titles } = sample();
    expect(searchTree(s, (id) => titles[id], '  ')).toBeNull();
  });

  it('finds chats by title ignoring case and accents, opening their folders', () => {
    const { s, uni, stats, work, titles } = sample();
    const r = searchTree(s, (id) => titles[id], 'REGRESSAO')!;
    expect([...r.show].sort()).toEqual([chat(1), uni, stats].sort());
    expect([...r.open].sort()).toEqual([uni, stats].sort());
    expect(r.show.has(work)).toBe(false);
  });

  it('shows everything inside a matching folder', () => {
    const { s, uni, stats, titles } = sample();
    const r = searchTree(s, (id) => titles[id], 'faculdade')!;
    expect(r.show).toEqual(new Set([uni, stats, chat(1)]));
    expect(r.open.size).toBe(0);
  });
});

describe('backup', () => {
  it('round-trips state and only the titles it uses', () => {
    const { s } = sample();
    const titles = {
      [chat(1)]: { title: 'Regressão linear', lastSeen: 1 },
      [chat(9)]: { title: 'Not in any folder', lastSeen: 1 },
    };
    const backup = createBackup(s, titles, new Date(0));
    expect(Object.keys(backup.titles)).toEqual([chat(1)]);
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
  });

  it.each([
    ['not JSON', 'nope'],
    ['another app', JSON.stringify({ app: 'Other', version: 1, exportedAt: '', state: emptyState() })],
    ['script in a folder id', JSON.stringify({ app: 'GeminiFolders', version: 1, exportedAt: '', state: { v: 1, rootOrder: ['<img>'], folders: {} } })],
  ])('rejects %s', (_, text) => {
    expect(parseBackup(text)).toBeNull();
  });

  it('rejects broken trees', () => {
    const { s, uni, stats } = sample();
    const wrap = (state: unknown) => JSON.stringify({ app: 'GeminiFolders', version: 1, exportedAt: '', state });
    // Folder placed twice
    expect(parseBackup(wrap({ ...s, rootOrder: [...s.rootOrder, stats] }))).toBeNull();
    // Cycle: Faculdade inside Estatística inside Faculdade, unreachable from the top
    const cyc = structuredClone(s);
    cyc.rootOrder = cyc.rootOrder.filter((id) => id !== uni);
    cyc.folders[stats]!.order.push(uni);
    expect(parseBackup(wrap(cyc))).toBeNull();
    // Chat listed twice
    const dup = structuredClone(s);
    dup.rootOrder.push(chat(1));
    expect(parseBackup(wrap(dup))).toBeNull();
  });

  it('rejects nesting deeper than 3 levels and oversized files', () => {
    let s = emptyState();
    let parent: string | null = null;
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const c = createFolder(s, `L${i}`, parent);
      s = c.state;
      parent = c.id;
      ids.push(c.id);
    }
    // Force a 4th level by hand.
    s.folders['F-deep000001'] = { name: 'L3', order: [] };
    s.folders[ids[2]!]!.order.push('F-deep000001');
    const wrap = JSON.stringify({ app: 'GeminiFolders', version: 1, exportedAt: '', state: s });
    expect(parseBackup(wrap)).toBeNull();
    expect(parseBackup(' '.repeat(1_000_001))).toBeNull();
  });
});
