// The only file that knows Gemini's DOM. Update here when Google changes the page.
export const SEL = {
  chatList: '[data-test-id="all-conversations"]',
  conversation: '[data-test-id="conversation"]',
  conversationLink: 'a[href^="/app/"]',
  /** The folder panel is inserted right before Gemini's "Recent" chats section. */
  panelAnchor: '[data-test-id="chats-expandable-section"]',
} as const;

const CHAT_HREF = /^\/app\/([a-f0-9]{8,})(?:[/?#]|$)/;

export function chatIdFromHref(href: string | null): string | null {
  return href ? (CHAT_HREF.exec(href)?.[1] ?? null) : null;
}

/** Chat id from a dragged link's text/uri-list (first non-comment line), only for Gemini URLs. */
export function chatIdFromUriList(uriList: string): string | null {
  const first = uriList.split(/\r?\n/).find((l) => l && !l.startsWith('#'));
  if (!first || !URL.canParse(first)) return null;
  const url = new URL(first);
  return url.origin === 'https://gemini.google.com' ? chatIdFromHref(url.pathname) : null;
}
