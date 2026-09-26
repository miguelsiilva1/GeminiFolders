// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { chatIdFromUriList } from '../../src/dom/selectors';
import { createFolder, emptyState, moveItem, moveRelative, parentOf } from '../../src/store/ops';
import { createStore } from '../../src/store/store';
import { App } from '../../src/ui/App';
import { bindStore, folders } from '../../src/ui/model';

const chat = (n: number) => n.toString(16).padStart(16, 'a');

// happy-dom lacks on<drag> properties, which Preact checks to lowercase event names (browsers have them).
for (const type of ['dragstart', 'dragend', 'dragover', 'drop'])
  Object.defineProperty(HTMLElement.prototype, 'on' + type, { value: null, writable: true, configurable: true });

describe('moveRelative', () => {
  function setup() {
    const a = createFolder(emptyState(), 'A');
    const b = createFolder(a.state, 'B');
    let s = b.state;
    for (let i = 1; i <= 3; i++) s = moveItem(s, chat(i), a.id, i);
    return { s, a: a.id, b: b.id };
  }

  it('reorders forwards and backwards within a folder', () => {
    const { s, a } = setup();
    expect(moveRelative(s, chat(1), chat(3), 'after').folders[a]!.order).toEqual([chat(2), chat(3), chat(1)]);
    expect(moveRelative(s, chat(1), chat(3), 'before').folders[a]!.order).toEqual([chat(2), chat(1), chat(3)]);
    expect(moveRelative(s, chat(3), chat(1), 'before').folders[a]!.order).toEqual([chat(3), chat(1), chat(2)]);
  });

  it('moves between folders and into folders', () => {
    const { s, a, b } = setup();
    expect(moveRelative(s, chat(2), b, 'into').folders[b]!.order).toEqual([chat(2)]);
    const nested = moveRelative(s, b, a, 'into');
    expect(parentOf(nested, b)).toBe(a);
    expect(moveRelative(nested, b, a, 'before').rootOrder).toEqual([b, a]);
  });

  it('adds a chat that was in no folder', () => {
    const { s, a } = setup();
    expect(moveRelative(s, chat(9), chat(1), 'before').folders[a]!.order[0]).toBe(chat(9));
  });
});

describe('chatIdFromUriList', () => {
  it('accepts only Gemini chat URLs', () => {
    expect(chatIdFromUriList(`https://gemini.google.com/app/${chat(1)}`)).toBe(chat(1));
    expect(chatIdFromUriList(`# comment\r\nhttps://gemini.google.com/app/${chat(1)}?hl=pt`)).toBe(chat(1));
    expect(chatIdFromUriList(`https://evil.example/app/${chat(1)}`)).toBeNull();
    expect(chatIdFromUriList('https://gemini.google.com/app')).toBeNull();
    expect(chatIdFromUriList('not a url')).toBeNull();
  });
});

describe('panel drag and drop', () => {
  let root: HTMLElement;
  const rowOf = (text: string) =>
    [...root.querySelectorAll<HTMLElement>('.label')].find((e) => e.textContent === text)!.closest<HTMLElement>('.row')!;

  // happy-dom's DragEvent ignores dataTransfer/clientY in its init dict, so attach them directly.
  const drag = (type: string, el: Element, dt: DataTransfer, clientY = 16) =>
    act(() => {
      const e = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(e, { dataTransfer: { value: dt }, clientY: { value: clientY } });
      el.dispatchEvent(e);
    });
  const nativeLink = (id: string) => {
    const dt = new DataTransfer();
    dt.setData('text/uri-list', `https://gemini.google.com/app/${id}`);
    return dt;
  };
  const dragRow = async (from: Element, to: Element, clientY = 16) => {
    const dt = new DataTransfer();
    await drag('dragstart', from, dt);
    await drag('dragover', to, dt, clientY);
    await drag('drop', to, dt, clientY);
  };
  const orderOf = (name: string) => Object.values(folders.value.folders).find((f) => f.name === name)!.order;

  beforeEach(async () => {
    fakeBrowser.reset();
    const store = await createStore();
    bindStore(store);
    for (const name of ['Work', 'Uni']) store.update((s) => createFolder(s, name).state);
    root = document.createElement('div');
    document.body.replaceChildren(root);
    act(() => render(<App />, root));
    // Rows are 32px tall starting at y=0.
    Element.prototype.getBoundingClientRect = () => ({ top: 0, height: 32 }) as DOMRect;
  });

  it('drops a chat dragged from the Gemini list into a folder', async () => {
    const dt = nativeLink(chat(1));
    await drag('dragover', rowOf('Work'), dt);
    expect(rowOf('Work').className).toContain('drop-into');
    await drag('drop', rowOf('Work'), dt);
    expect(orderOf('Work')).toEqual([chat(1)]);
    expect(rowOf('Work').className).not.toContain('drop-');
  });

  it('ignores links that are not Gemini chats', async () => {
    const dt = new DataTransfer();
    dt.setData('text/uri-list', `https://evil.example/app/${chat(1)}`);
    await drag('drop', rowOf('Work'), dt);
    expect(orderOf('Work')).toEqual([]);
  });

  it('reorders chats and moves them between folders', async () => {
    await drag('drop', rowOf('Work'), nativeLink(chat(1)));
    await drag('drop', rowOf('Work'), nativeLink(chat(2)));
    const titles = root.querySelectorAll('.row .label.muted');
    expect(titles).toHaveLength(2);

    const [first, second] = [...root.querySelectorAll<HTMLElement>('a.main')].map((a) => a.closest('.row')!);
    await dragRow(second!, first!, 4); // top half = before
    expect(orderOf('Work')).toEqual([chat(2), chat(1)]);

    await dragRow(root.querySelector<HTMLElement>('a.main')!.closest('.row')!, rowOf('Uni'));
    expect(orderOf('Work')).toEqual([chat(1)]);
    expect(orderOf('Uni')).toEqual([chat(2)]);
  });

  it('nests folders and moves them back to the top level via the header', async () => {
    await dragRow(rowOf('Uni'), rowOf('Work'), 16); // middle = into
    expect(orderOf('Work')).toHaveLength(1);
    expect(folders.value.rootOrder).toHaveLength(1);

    await dragRow(rowOf('Uni'), root.querySelector('.header')!);
    expect(folders.value.rootOrder).toHaveLength(2);
    expect(orderOf('Work')).toEqual([]);
  });

  it('keeps chats without a folder at the top level, placed by row edges or the header', async () => {
    await drag('drop', rowOf('Uni'), nativeLink(chat(1)), 2); // top edge of Uni = before it
    await drag('drop', root.querySelector('.header')!, nativeLink(chat(2)));
    const [work, , uni] = folders.value.rootOrder;
    expect(folders.value.rootOrder).toEqual([work, chat(1), uni, chat(2)]);
    expect(orderOf('Uni')).toEqual([]);
    expect(root.querySelector(`a[href="/app/${chat(1)}"]`)!.closest('.row')!.querySelector('button')!.title).toBe(
      'Remove from Folders',
    );
  });

  it('accepts chats on the empty-panel hint', async () => {
    fakeBrowser.reset();
    const empty = await createStore();
    act(() => void bindStore(empty));
    await drag('drop', root.querySelector('.hint')!, nativeLink(chat(1)));
    expect(folders.value.rootOrder).toEqual([chat(1)]);
  });

  it('reorders folders using the row edges', async () => {
    await dragRow(rowOf('Uni'), rowOf('Work'), 2); // top quarter = before
    const names = folders.value.rootOrder.map((id) => folders.value.folders[id]!.name);
    expect(names).toEqual(['Uni', 'Work']);
  });
});
