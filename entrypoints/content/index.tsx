import css from '../../src/ui/style.css?inline';
import { effect } from '@preact/signals';
import { render } from 'preact';
import { hiddenChatsCss, mountPageStyle } from '../../src/dom/hideStyle';
import { watchCurrentChat } from '../../src/dom/router';
import { watchChats } from '../../src/dom/scanner';
import { SEL } from '../../src/dom/selectors';
import { isChatId } from '../../src/store/schema';
import { createStore } from '../../src/store/store';
import { recordTitles } from '../../src/store/titles';
import { App } from '../../src/ui/App';
import { bindStore, currentChat, folders, hideOrganized, loadPrefs, watchTitles } from '../../src/ui/model';

export default defineContentScript({
  matches: ['https://gemini.google.com/*'],
  // CSS is inlined into the shadow root; no web_accessible_resources the page could probe for.
  cssInjectionMode: 'manual',
  async main(ctx) {
    ctx.onInvalidated(watchChats((chats) => recordTitles(chats).catch(console.error)));
    watchCurrentChat(ctx, (id) => (currentChat.value = id));

    const [store, stopTitles] = await Promise.all([createStore(), watchTitles(), loadPrefs()]);
    ctx.onInvalidated(stopTitles);
    ctx.onInvalidated(bindStore(store));
    ctx.onInvalidated(store.dispose);

    // Optionally hide chats that are already in the panel from Gemini's Recent list.
    const pageStyle = mountPageStyle();
    ctx.onInvalidated(pageStyle.remove);
    ctx.onInvalidated(
      effect(() => {
        const { rootOrder, folders: all } = folders.value;
        const chats = [...rootOrder, ...Object.values(all).flatMap((f) => f.order)].filter(isChatId);
        pageStyle.set(hideOrganized.value ? hiddenChatsCss(chats) : '');
      }),
    );

    const ui = await createShadowRootUi(ctx, {
      name: 'gemini-folders',
      position: 'inline',
      anchor: SEL.panelAnchor,
      append: 'before',
      mode: 'closed',
      css,
      inheritStyles: true,
      isolateEvents: true, // keep typing in our inputs away from Gemini's shortcuts
      onMount: (container) => {
        render(<App />, container);
        return container;
      },
      onRemove: (container) => container && render(null, container),
    });
    ui.autoMount(); // Gemini re-renders its sidebar; remount whenever the anchor comes back
  },
});
