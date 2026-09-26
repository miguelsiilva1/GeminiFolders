import { describe, expect, it } from 'vitest';
import { mergeTitles } from '../../src/store/titles';

const DAY = 86_400_000;

describe('mergeTitles', () => {
  const cache = { aaaaaaaa: { title: 'Old', lastSeen: 0 } };

  it('skips writes when nothing changed within a day', () => {
    expect(mergeTitles(cache, [{ id: 'aaaaaaaa', title: 'Old' }], DAY - 1)).toBeNull();
  });

  it('records renamed, new, and day-old chats', () => {
    expect(mergeTitles(cache, [{ id: 'aaaaaaaa', title: 'New' }], 5)!.aaaaaaaa).toEqual({ title: 'New', lastSeen: 5 });
    expect(mergeTitles(cache, [{ id: 'bbbbbbbb', title: 'B' }], 5)).toHaveProperty('bbbbbbbb');
    expect(mergeTitles(cache, [{ id: 'aaaaaaaa', title: 'Old' }], DAY)!.aaaaaaaa!.lastSeen).toBe(DAY);
  });
});
