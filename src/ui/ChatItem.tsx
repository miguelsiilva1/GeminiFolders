import { openChat } from '../dom/navigate';
import { unassignChat } from '../store/ops';
import { dragSource, dropClass, dropZone } from './dnd';
import { ICONS, Icon } from './icons';
import { t } from './i18n';
import { act, currentChat, titles } from './model';

export function ChatItem({ id, level }: { id: string; level: number }) {
  const title = titles.value[id]?.title;
  const active = currentChat.value === id;
  const remove = level === 0 ? t.removeFromPanel : t.removeFromFolder;
  return (
    <div
      class={(active ? 'row active' : 'row') + dropClass(id)}
      style={{ '--level': level }}
      {...dragSource(id, 'chat')}
      {...dropZone(id, 'chat')}
    >
      <a
        class="main"
        href={`/app/${id}`}
        title={title}
        aria-current={active ? 'page' : undefined}
        onClick={(e) => {
          if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          openChat(id);
        }}
      >
        <span class={title ? 'label' : 'label muted'}>{title ?? t.untitled}</span>
      </a>
      <button
        class="icon-btn"
        aria-label={remove}
        title={remove}
        onClick={() => act((s) => unassignChat(s, id))}
      >
        <Icon d={ICONS.close} />
      </button>
    </div>
  );
}
