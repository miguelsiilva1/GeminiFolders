import { SEL, chatIdFromHref } from './selectors';

export type ChatRef = { id: string; title: string };

export function scanChats(root: ParentNode = document): ChatRef[] {
  const chats: ChatRef[] = [];
  for (const item of root.querySelectorAll(SEL.conversation)) {
    const link = item.querySelector<HTMLAnchorElement>(SEL.conversationLink);
    const id = chatIdFromHref(link?.getAttribute('href') ?? null);
    if (!link || !id) continue;
    const title = (link.textContent ?? '').trim().split('\n')[0]!.trim();
    chats.push({ id, title });
  }
  return chats;
}

/** Calls onChange with the full list whenever the set of visible chats changes. */
export function watchChats(onChange: (chats: ChatRef[]) => void): () => void {
  let lastKey = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    const chats = scanChats();
    const key = chats.map((c) => c.id + c.title).join('|');
    if (key === lastKey) return;
    lastKey = key;
    onChange(chats);
  };
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(run, 300);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  run();
  return () => {
    clearTimeout(timer);
    observer.disconnect();
  };
}
