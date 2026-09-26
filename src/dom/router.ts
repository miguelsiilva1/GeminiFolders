import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { chatIdFromHref } from './selectors';

/** Calls onChange with the open chat id (null on home/new chat) now and on every SPA navigation. */
export function watchCurrentChat(ctx: ContentScriptContext, onChange: (id: string | null) => void) {
  // The navigate event fires before `location` updates, so read the destination from the event.
  ctx.addEventListener(window, 'wxt:locationchange', (e) => onChange(chatIdFromHref(e.newUrl.pathname)));
  onChange(chatIdFromHref(location.pathname));
}
