import { signal } from '@preact/signals';
import { chatIdFromUriList } from '../dom/selectors';
import { moveItem, moveRelative, type DropPos } from '../store/ops';
import { act } from './model';

// Only data *types* are readable during dragover, so the kind of item is encoded in the type.
const CHAT = 'application/x-gemini-folders-chat';
const FOLDER = 'application/x-gemini-folders-folder';
// Dragging a chat link from Gemini's own list carries its URL.
const URI = 'text/uri-list';

/** Drop zone id for the panel header (move a folder to the top level). */
export const ROOT = 'root';

type Kind = 'chat' | 'folder';
type Zone = Kind | 'into' | 'root';

export const dropTarget = signal<{ id: string; pos: DropPos } | null>(null);

// dragleave is noisy across child elements; instead the indicator expires unless dragover keeps refreshing it.
let clearTimer: ReturnType<typeof setTimeout> | undefined;
function showDrop(id: string, pos: DropPos) {
  const cur = dropTarget.value;
  if (cur?.id !== id || cur.pos !== pos) dropTarget.value = { id, pos };
  clearTimeout(clearTimer);
  clearTimer = setTimeout(clearDrop, 150);
}
function clearDrop() {
  clearTimeout(clearTimer);
  dropTarget.value = null;
}

function draggedKind(dt: DataTransfer): Kind | null {
  if (dt.types.includes(FOLDER)) return 'folder';
  if (dt.types.includes(CHAT) || dt.types.includes(URI)) return 'chat';
  return null;
}

function draggedId(dt: DataTransfer): string | null {
  return dt.getData(FOLDER) || dt.getData(CHAT) || chatIdFromUriList(dt.getData(URI));
}

/** Uses "move" when the source allows it (our rows), otherwise what a plain link drag allows. */
function effectFor(dt: DataTransfer): 'move' | 'link' | 'copy' {
  const allowed = dt.effectAllowed.toLowerCase();
  if (allowed === 'all' || allowed === 'uninitialized' || allowed.includes('move')) return 'move';
  return allowed.includes('link') ? 'link' : 'copy';
}

function posFor(e: DragEvent, zone: Zone, dragged: Kind): DropPos | null {
  if (zone === 'into') return 'into';
  if (zone === 'root') return dragged === 'folder' ? 'into' : null;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const y = (e.clientY - rect.top) / rect.height;
  if (zone === 'chat') return y < 0.5 ? 'before' : 'after';
  // Folder rows: chats always go inside; folders go before/after near the edges, inside in the middle.
  if (dragged === 'chat') return 'into';
  return y < 0.25 ? 'before' : y > 0.75 ? 'after' : 'into';
}

export function dragSource(id: string, kind: Kind) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.stopPropagation();
      const dt = e.dataTransfer!;
      dt.setData(kind === 'chat' ? CHAT : FOLDER, id);
      dt.effectAllowed = 'move';
    },
    onDragEnd: clearDrop,
  };
}

export function dropZone(targetId: string, zone: Zone) {
  const pos = (e: DragEvent) => {
    const kind = e.dataTransfer && draggedKind(e.dataTransfer);
    return kind ? posFor(e, zone, kind) : null;
  };
  return {
    onDragOver: (e: DragEvent) => {
      const p = pos(e);
      if (!p) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer!.dropEffect = effectFor(e.dataTransfer!);
      showDrop(targetId, p);
    },
    onDrop: (e: DragEvent) => {
      const p = pos(e);
      if (!p) return;
      e.preventDefault();
      e.stopPropagation();
      clearDrop();
      const id = draggedId(e.dataTransfer!);
      if (!id || id === targetId) return;
      act((s) => (zone === 'root' ? moveItem(s, id, null, s.rootOrder.length) : moveRelative(s, id, targetId, p)));
    },
  };
}

/** Class suffix for the row currently under the pointer. */
export function dropClass(id: string): string {
  const d = dropTarget.value;
  return d?.id === id ? ` drop-${d.pos}` : '';
}
