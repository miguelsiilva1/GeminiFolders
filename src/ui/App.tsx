import { FolderList } from './FolderTree';
import { ICONS, Icon } from './icons';
import { t } from './i18n';
import { SECTION, collapsed, folders, newFolder, toast, toggleCollapsed } from './model';

export function App() {
  const open = !collapsed.value.has(SECTION);
  const root = folders.value.rootOrder;
  return (
    <section class="panel" aria-label={t.folders}>
      <div class="header">
        <button class="header-toggle" aria-expanded={open} onClick={() => toggleCollapsed(SECTION)}>
          <span>{t.folders}</span>
          <Icon d={ICONS.expand} class={open ? undefined : 'rot'} />
        </button>
        <button class="icon-btn" aria-label={t.newFolder} title={t.newFolder} onClick={() => newFolder(null)}>
          <Icon d={ICONS.add} />
        </button>
      </div>
      {open && (root.length ? <FolderList ids={root} level={0} /> : <div class="empty hint">{t.noFolders}</div>)}
      {toast.value && (
        <div class="toast" role="status">
          {toast.value}
        </div>
      )}
    </section>
  );
}
