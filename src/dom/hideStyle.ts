import { isChatId } from '../store/schema';
import { SEL } from './selectors';

/** CSS hiding the given chats in Gemini's Recent list. Rows stay in the DOM; only display changes. */
export function hiddenChatsCss(ids: string[]): string {
  const rows = ids.filter(isChatId).map((id) => `${SEL.chatList} ${SEL.conversation}:has(> a[href="/app/${id}"])`);
  return rows.length ? `${rows.join(',\n')} { display: none !important; }` : '';
}

/** A <style> element in the page, for rules that must reach Gemini's own elements. */
export function mountPageStyle() {
  const el = document.createElement('style');
  document.head.append(el);
  return {
    set(css: string) {
      if (el.textContent !== css) el.textContent = css;
    },
    remove: () => el.remove(),
  };
}
