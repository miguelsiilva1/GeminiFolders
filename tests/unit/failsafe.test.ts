// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { openChat } from '../../src/dom/navigate';
import { scanChats, watchChats } from '../../src/dom/scanner';
import { createStore } from '../../src/store/store';

const ID = 'abcdef0123456789';

beforeEach(() => {
  fakeBrowser.reset();
  document.body.innerHTML = '';
});

describe('when Gemini changes its page', () => {
  it('finds nothing (and throws nothing) if the sidebar markup is gone', () => {
    document.body.innerHTML = '<nav><a href="/app/abcdef0123456789">Old chat</a></nav>';
    expect(scanChats()).toEqual([]);
    const onChange = vi.fn();
    const stop = watchChats(onChange);
    expect(onChange).not.toHaveBeenCalled(); // nothing found, nothing reported
    stop();
  });

  it('skips rows whose link is missing or is not a chat', () => {
    document.body.innerHTML = `
      <div data-test-id="conversation"></div>
      <div data-test-id="conversation"><a href="/settings">Settings</a></div>
      <div data-test-id="conversation"><a href="https://evil.example/app/${ID}">x</a></div>
      <div data-test-id="conversation"><a href="/app/${ID}">${'Long title '.repeat(50)}</a></div>`;
    const chats = scanChats();
    expect(chats).toHaveLength(1);
    expect(chats[0]!.id).toBe(ID);
    expect(chats[0]!.title.length).toBeLessThanOrEqual(200);
  });

  it("opens a chat through Gemini's own link when it is in the sidebar", () => {
    document.body.innerHTML = `<div data-test-id="conversation"><a href="/app/${ID}">Chat</a></div>`;
    const link = document.querySelector('a')!;
    const click = vi.fn((e: Event) => e.preventDefault());
    link.addEventListener('click', click);
    openChat(ID);
    expect(click).toHaveBeenCalledOnce();
  });
});

describe('corrupted sync data', () => {
  it('refuses to load instead of overwriting it', async () => {
    const corrupted = { meta: { v: 1, rootOrder: ['not-an-id'] }, 'f:F-abcdef1234': { name: '', order: 5 } };
    await fakeBrowser.storage.sync.set(corrupted);
    await expect(createStore()).rejects.toThrow();
    expect(await fakeBrowser.storage.sync.get(null)).toEqual(corrupted);
  });
});
