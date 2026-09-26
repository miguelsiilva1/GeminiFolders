import { useEffect, useRef, useState } from 'preact/hooks';
import { ContextMenu, type MenuItem } from './ContextMenu';
import { ROOT, dropClass, dropZone } from './dnd';
import { FolderList } from './FolderTree';
import { ICONS, Icon } from './icons';
import { t } from './i18n';
import {
  SECTION,
  collapsed,
  exportBackup,
  folders,
  hideOrganized,
  importBackup,
  newFolder,
  query,
  searchResult,
  toast,
  toggleCollapsed,
  toggleHideOrganized,
} from './model';

export function App() {
  const [menuAt, setMenuAt] = useState<DOMRect | null>(null);
  const [searching, setSearching] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const open = !collapsed.value.has(SECTION);
  const root = folders.value.rootOrder;
  const result = searchResult.value;

  const closeSearch = () => {
    setSearching(false);
    query.value = '';
  };
  const openSearch = () => {
    if (!open) toggleCollapsed(SECTION);
    setSearching(true);
  };

  const items: MenuItem[] = [
    { label: t.hideOrganized, checked: hideOrganized.value, onSelect: toggleHideOrganized },
    { label: t.exportBackup, onSelect: exportBackup },
    { label: t.importBackup, confirm: t.confirmImport, onSelect: () => fileInput.current?.click() },
  ];

  const body = !root.length ? (
    <div class={'empty hint' + dropClass(ROOT)} {...dropZone(ROOT, 'root')}>
      {t.noFolders}
    </div>
  ) : result && !result.show.size ? (
    <div class="empty hint">{t.noResults}</div>
  ) : (
    <FolderList ids={root} level={0} />
  );

  return (
    <section class="panel" aria-label={t.folders}>
      <div class={'header' + dropClass(ROOT)} {...dropZone(ROOT, 'root')}>
        <button class="header-toggle" aria-expanded={open} onClick={() => toggleCollapsed(SECTION)}>
          <span>{t.folders}</span>
          <Icon d={ICONS.expand} class={open ? undefined : 'rot'} />
        </button>
        <button
          class="icon-btn"
          aria-label={t.search}
          title={t.search}
          aria-pressed={searching}
          onClick={searching ? closeSearch : openSearch}
        >
          <Icon d={ICONS.search} />
        </button>
        <button class="icon-btn" aria-label={t.newFolder} title={t.newFolder} onClick={() => newFolder(null)}>
          <Icon d={ICONS.add} />
        </button>
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
      {open && searching && <SearchBox onClose={closeSearch} />}
      {open && body}
      {menuAt && <ContextMenu at={menuAt} items={items} onClose={() => setMenuAt(null)} />}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = '';
          if (file) importBackup(file).catch(console.error);
        }}
      />
      {toast.value && (
        <div class="toast" role="status">
          {toast.value}
        </div>
      )}
    </section>
  );
}

function SearchBox({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div class="search">
      <Icon d={ICONS.search} />
      <input
        ref={ref}
        type="search"
        placeholder={t.search}
        aria-label={t.search}
        value={query.value}
        onInput={(e) => (query.value = e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      />
    </div>
  );
}
