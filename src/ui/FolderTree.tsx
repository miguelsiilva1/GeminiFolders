import { useEffect, useRef, useState } from 'preact/hooks';
import { deleteFolder, moveItem, renameFolder } from '../store/ops';
import { MAX_DEPTH, MAX_NAME, isFolderId } from '../store/schema';
import { ChatItem } from './ChatItem';
import { ContextMenu, type MenuItem } from './ContextMenu';
import { dragSource, dropClass, dropZone } from './dnd';
import { ICONS, Icon } from './icons';
import { t } from './i18n';
import {
  act,
  collapsed,
  currentChat,
  editingId,
  folders,
  newFolder,
  searchResult,
  toggleCollapsed,
} from './model';

/** level = indentation step; root folders are level 0 (and depth 1). */
export function FolderList({ ids, level }: { ids: string[]; level: number }) {
  const shown = searchResult.value?.show;
  return (
    <>
      {(shown ? ids.filter((id) => shown.has(id)) : ids).map((id) =>
        isFolderId(id) ? <FolderNode key={id} id={id} level={level} /> : <ChatItem key={id} id={id} level={level} />,
      )}
    </>
  );
}

function FolderNode({ id, level }: { id: string; level: number }) {
  const [menuAt, setMenuAt] = useState<DOMRect | null>(null);
  const folder = folders.value.folders[id];
  if (!folder) return null;

  const open = !collapsed.value.has(id) || !!searchResult.value?.open.has(id);
  const editing = editingId.value === id;
  const chatCount = folder.order.filter((c) => !isFolderId(c)).length;
  const current = currentChat.value;

  const items: MenuItem[] = [
    {
      label: t.addCurrent,
      hidden: !current || folder.order.includes(current),
      onSelect: () => act((s) => moveItem(s, current!, id, folder.order.length)),
    },
    { label: t.newSubfolder, hidden: level + 1 >= MAX_DEPTH, onSelect: () => newFolder(id) },
    { label: t.rename, onSelect: () => (editingId.value = id) },
    { label: t.deleteFolder, confirm: t.confirmDelete, danger: true, onSelect: () => act((s) => deleteFolder(s, id)) },
  ];

  const finishRename = (name: string | null) => {
    editingId.value = null;
    if (name !== null && name.trim() !== folder.name) act((s) => renameFolder(s, id, name));
  };

  const icons = (
    <>
      <Icon d={ICONS.chevron} class={open ? 'chev open' : 'chev'} />
      <Icon d={ICONS.folder} />
    </>
  );

  return (
    <>
      <div
        class={'row' + dropClass(id)}
        style={{ '--level': level }}
        {...(editing ? {} : dragSource(id, 'folder'))}
        {...dropZone(id, 'folder')}
      >
        {editing ? (
          <div class="main">
            {icons}
            <RenameInput initial={folder.name} onDone={finishRename} />
          </div>
        ) : (
          <button class="main" aria-expanded={open} title={folder.name} onClick={() => toggleCollapsed(id)}>
            {icons}
            <span class="label">{folder.name}</span>
            {chatCount > 0 && <span class="count">{chatCount}</span>}
          </button>
        )}
        <button
          class="icon-btn"
          aria-label={t.options}
          title={t.options}
          aria-haspopup="menu"
          aria-expanded={!!menuAt}
          onClick={(e) => setMenuAt(e.currentTarget.getBoundingClientRect())}
        >
          <Icon d={ICONS.more} />
        </button>
      </div>
      {menuAt && <ContextMenu at={menuAt} items={items} onClose={() => setMenuAt(null)} />}
      {open &&
        (folder.order.length ? (
          <FolderList ids={folder.order} level={level + 1} />
        ) : (
          <div class="empty" style={{ '--level': level + 1 }} {...dropZone(id, 'into')}>
            {t.empty}
          </div>
        ))}
    </>
  );
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (name: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  const finish = (name: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(name);
  };
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      class="rename"
      defaultValue={initial}
      maxLength={MAX_NAME}
      aria-label={t.rename}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(e.currentTarget.value);
        else if (e.key === 'Escape') finish(null);
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
    />
  );
}
