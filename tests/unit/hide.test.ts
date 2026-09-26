import { describe, expect, it } from 'vitest';
import { hiddenChatsCss } from '../../src/dom/hideStyle';

describe('hiddenChatsCss', () => {
  it('hides the given chats in the Recent list only', () => {
    const css = hiddenChatsCss(['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb']);
    expect(css).toContain('[data-test-id="all-conversations"] [data-test-id="conversation"]:has(> a[href="/app/aaaaaaaaaaaaaaaa"])');
    expect(css).toContain('a[href="/app/bbbbbbbbbbbbbbbb"]');
    expect(css.endsWith('{ display: none !important; }')).toBe(true);
  });

  it('emits nothing for no chats and ignores anything that is not a chat id', () => {
    expect(hiddenChatsCss([])).toBe('');
    expect(hiddenChatsCss(['"] body { display:none } [x="', 'F-abcdef1234'])).toBe('');
  });
});
