import { SEL, chatIdFromHref } from './selectors';

/** Opens a chat through Gemini's own sidebar link (SPA navigation), or a full page load if it isn't loaded there. */
export function openChat(id: string) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>(`${SEL.conversation} ${SEL.conversationLink}`)) {
    if (chatIdFromHref(link.getAttribute('href')) === id) {
      link.click();
      return;
    }
  }
  location.assign(`/app/${id}`);
}
