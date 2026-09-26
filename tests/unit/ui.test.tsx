// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createStore } from '../../src/store/store';
import { App } from '../../src/ui/App';
import { createBackup } from '../../src/store/backup';
import { createFolder, emptyState, moveItem } from '../../src/store/ops';
import {
  bindStore,
  currentChat,
  folders,
  hideOrganized,
  importBackup,
  query,
  titles,
  toast,
} from '../../src/ui/model';

const CHAT = 'aaaaaaaa11111111';
let root: HTMLElement;

const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
const byText = (text: string) =>
  [...root.querySelectorAll<HTMLElement>('button, span, a')].find((e) => e.textContent === text);
const click = (el: Element | null | undefined) => act(() => (el as HTMLElement).click());

beforeEach(async () => {
  fakeBrowser.reset();
  bindStore(await createStore());
  titles.value = {};
  currentChat.value = null;
  query.value = '';
  hideOrganized.value = false;
  root = document.createElement('div');
  document.body.replaceChildren(root);
  act(() => render(<App />, root));
});

async function createFolderNamed(name: string) {
  await click(q('[aria-label="New folder"]'));
  const input = q<HTMLInputElement>('input.rename')!;
  expect(document.activeElement).toBe(input);
  input.value = name;
  await act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  });
}

describe('folder panel', () => {
  it('shows a hint with no folders', () => {
    expect(root.textContent).toContain('Create a folder with +');
  });

  it('creates and renames a folder inline', async () => {
    await createFolderNamed('Uni');
    expect(byText('Uni')).toBeTruthy();
    expect(q('input.rename')).toBeNull();
    expect(root.textContent).toContain('Empty folder');
  });

  it('adds the current chat, shows its title, and removes it', async () => {
    await createFolderNamed('Work');
    currentChat.value = CHAT;
    titles.value = { [CHAT]: { title: 'Budget plan', lastSeen: 0 } };
    await click(q('.row [aria-label="Options"]'));
    await click(byText('Add current chat'));
    const link = q<HTMLAnchorElement>(`a[href="/app/${CHAT}"]`)!;
    expect(link.textContent).toBe('Budget plan');
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(q('.count')!.textContent).toBe('1');

    await click(q('[aria-label="Remove from folder"]'));
    expect(q(`a[href="/app/${CHAT}"]`)).toBeNull();
  });

  it('collapses a folder', async () => {
    await createFolderNamed('A');
    await click(byText('A')!.closest('button'));
    expect(root.textContent).not.toContain('Empty folder');
  });

  it('asks for confirmation before deleting', async () => {
    await createFolderNamed('Tmp');
    await click(q('.row [aria-label="Options"]'));
    await click(byText('Delete folder'));
    expect(byText('Click again to delete')).toBeTruthy();
    expect(Object.keys(folders.value.folders)).toHaveLength(1);
    await click(byText('Click again to delete'));
    expect(Object.keys(folders.value.folders)).toHaveLength(0);
  });

  it('shows a message for invalid names', async () => {
    await createFolderNamed('   ');
    expect(q('[role="status"]')!.textContent).toBe('Folder name must be 1–80 characters.');
    expect(byText('New folder')).toBeTruthy();
  });

  it('renders titles as text, never HTML', async () => {
    await createFolderNamed('X');
    currentChat.value = CHAT;
    titles.value = { [CHAT]: { title: '<img src=x onerror=alert(1)>', lastSeen: 0 } };
    await click(q('.row [aria-label="Options"]'));
    await click(byText('Add current chat'));
    expect(q('img')).toBeNull();
    expect(q(`a[href="/app/${CHAT}"]`)!.textContent).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('header tools', () => {
  async function typeSearch(text: string) {
    const input = q<HTMLInputElement>('.search input')!;
    input.value = text;
    await act(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('filters folders and chats and restores everything when closed', async () => {
    await createFolderNamed('Uni');
    await createFolderNamed('Work');
    currentChat.value = CHAT;
    titles.value = { [CHAT]: { title: 'Budget plan', lastSeen: 0 } };
    await click(byText('Work')!.closest('.row')!.querySelector('[aria-label="Options"]'));
    await click(byText('Add current chat'));
    await click(byText('Work')!.closest('button')); // collapse Work
    expect(q(`a[href="/app/${CHAT}"]`)).toBeNull();

    await click(q('[aria-label="Search folders"]'));
    await typeSearch('budget');
    expect(byText('Uni')).toBeUndefined();
    expect(q(`a[href="/app/${CHAT}"]`)).not.toBeNull(); // collapsed folder opened for the match

    await typeSearch('zzz');
    expect(root.textContent).toContain('No results');

    await act(() => {
      q('.search input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(q('.search')).toBeNull();
    expect(byText('Uni')).toBeTruthy();
  });

  it('toggles hiding organized chats from the header menu', async () => {
    await click(q('.header [aria-label="Options"]'));
    const item = byText('Hide these chats in Recent')!;
    expect(item.getAttribute('aria-checked')).toBe('false');
    await click(item);
    expect(hideOrganized.value).toBe(true);
    await click(q('.header [aria-label="Options"]'));
    expect(byText('Hide these chats in Recent')!.getAttribute('aria-checked')).toBe('true');
  });

  it('imports a valid backup and rejects anything else', async () => {
    await createFolderNamed('Old');
    const made = createFolder(emptyState(), 'Imported');
    const state = moveItem(made.state, CHAT, made.id, 0);
    const backup = createBackup(state, { [CHAT]: { title: 'From backup', lastSeen: 0 } });

    await act(() => importBackup(new File(['{"nope":1}'], 'bad.json')));
    expect(toast.value).toBe("That file isn't a valid GeminiFolders backup.");
    expect(byText('Old')).toBeTruthy();

    await act(() => importBackup(new File([JSON.stringify(backup)], 'good.json')));
    expect(toast.value).toBe('Backup imported.');
    expect(byText('Old')).toBeUndefined();
    expect(byText('Imported')).toBeTruthy();
    expect(Object.values(folders.value.folders)[0]!.order).toEqual([CHAT]);
    const stored = (await fakeBrowser.storage.local.get('titles')).titles as Record<string, { title: string }>;
    expect(stored[CHAT]!.title).toBe('From backup');
  });
});
