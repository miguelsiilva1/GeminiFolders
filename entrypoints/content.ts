import { watchChats } from '../src/dom/scanner';
import { watchCurrentChat } from '../src/dom/router';
import { createStore } from '../src/store/store';
import { recordTitles } from '../src/store/titles';

export default defineContentScript({
  matches: ['https://gemini.google.com/*'],
  async main(ctx) {
    const stop = watchChats((chats) => {
      console.log(`[GeminiFolders] ${chats.length} chats visible`);
      recordTitles(chats).catch(console.error);
    });
    ctx.onInvalidated(stop);

    watchCurrentChat(ctx, (id) => console.log('[GeminiFolders] current chat:', id));

    const store = await createStore();
    ctx.onInvalidated(store.dispose);
    console.log('[GeminiFolders] folders loaded:', Object.keys(store.get().folders).length);
  },
});
