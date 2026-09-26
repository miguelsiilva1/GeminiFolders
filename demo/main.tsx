// Demo page for README screenshots: the real panel with example data in a Gemini-style sidebar.
// Run `npm run demo`, then open /?view=folders | search | menu | drag.
import './fake-chrome';
import css from '../src/ui/style.css?inline';
import { render } from 'preact';
import { browser } from 'wxt/browser';
import { createFolder, emptyState, moveItem } from '../src/store/ops';
import type { State } from '../src/store/schema';
import { createStore } from '../src/store/store';
import { saveState } from '../src/store/sync';
import { App } from '../src/ui/App';
import { dropTarget } from '../src/ui/dnd';
import { bindStore, currentChat, loadPrefs, watchTitles } from '../src/ui/model';

let n = 0;
const titles: Record<string, { title: string; lastSeen: number }> = {};
const ids: Record<string, string> = {};

function build(): State {
  let s = emptyState();
  const folder = (name: string, parent: string | null = null) => {
    const c = createFolder(s, name, parent);
    s = c.state;
    ids[name] = c.id;
    return c.id;
  };
  const chat = (title: string, parent: string | null) => {
    const id = (++n).toString(16).padStart(16, 'a');
    titles[id] = { title, lastSeen: 0 };
    ids[title] = id;
    s = moveItem(s, id, parent, Infinity);
  };

  const uni = folder('University');
  const stats = folder('Statistics', uni);
  chat('Linear regression explained', stats);
  chat('Hypothesis testing cheat sheet', stats);
  const db = folder('Databases', uni);
  chat('SQL joins with examples', db);
  chat('Normalization: 1NF to 3NF', db);
  chat('Thesis outline', uni);
  const work = folder('Work');
  chat('Q3 marketing plan', work);
  chat('Follow-up email to client', work);
  chat('Weekly report template', work);
  const personal = folder('Personal');
  chat('Lisbon trip itinerary', personal);
  chat('Meal prep for the week', personal);
  const side = folder('Side projects');
  chat('Home server setup', side);
  chat('Budget spreadsheet formulas', null);
  chat('Learning Rust roadmap', null);
  return s;
}

const state = build();
await saveState(emptyState(), state);
await browser.storage.local.set({
  titles,
  collapsed: [ids['Databases'], ids['Personal'], ids['Side projects']],
});

const store = await createStore();
bindStore(store);
await Promise.all([watchTitles(), loadPrefs()]);
currentChat.value = ids['Follow-up email to client']!;

const host = document.getElementById('panel')!;
const shadow = host.attachShadow({ mode: 'open' });
const style = document.createElement('style');
style.textContent = css + '* { transition: none !important; }'; // no half-animated screenshots
const container = document.createElement('div');
shadow.append(style, container);
render(<App />, container);

// Put the panel in the state each screenshot shows.
const view = new URLSearchParams(location.search).get('view');
const q = <T extends Element>(sel: string) => shadow.querySelector<T>(sel)!;
await new Promise((r) => setTimeout(r, 50));
if (view === 'search') {
  q<HTMLButtonElement>('[aria-label="Search folders"]').click();
  await new Promise((r) => setTimeout(r, 50));
  const input = q<HTMLInputElement>('.search input');
  input.value = 'sql';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.blur();
} else if (view === 'menu') {
  q<HTMLButtonElement>('.header [aria-label="Options"]').click();
  await new Promise((r) => setTimeout(r, 50));
  (shadow.activeElement as HTMLElement | null)?.blur();
} else if (view === 'drag') {
  dropTarget.value = { id: ids['Personal']!, pos: 'into' };
}
document.body.dataset.ready = 'true';
