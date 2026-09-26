import css from '../../src/ui/style.css?inline';
import { render } from 'preact';
import { watchCurrentChat } from '../../src/dom/router';
import { watchChats } from '../../src/dom/scanner';
import { SEL } from '../../src/dom/selectors';
import { createStore } from '../../src/store/store';
import { recordTitles } from '../../src/store/titles';
import { App } from '../../src/ui/App';
import { bindStore, currentChat, loadCollapsed, watchTitles } from '../../src/ui/model';

export default defineContentScript({
  matches: ['https://gemini.google.com/*'],
  // CSS is inlined into the shadow root; no web_accessible_resources the page could probe for.
  cssInjectionMode: 'manual',
  async main(ctx) {
    ctx.onInvalidated(watchChats((chats) => recordTitles(chats).catch(console.error)));
    watchCurrentChat(ctx, (id) => (currentChat.value = id));

    const [store, stopTitles] = await Promise.all([createStore(), watchTitles(), loadCollapsed()]);
    ctx.onInvalidated(stopTitles);
    ctx.onInvalidated(bindStore(store));
    ctx.onInvalidated(store.dispose);

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
