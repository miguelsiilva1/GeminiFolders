import { useLayoutEffect, useRef, useState } from 'preact/hooks';

export type MenuItem = {
  label: string;
  onSelect: () => void;
  /** Label shown after a first click; the action runs on the second click. */
  confirm?: string;
  danger?: boolean;
  hidden?: boolean;
};

export function ContextMenu({ at, items, onClose }: { at: DOMRect; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [pos, setPos] = useState({ top: at.bottom, left: at.left });

  useLayoutEffect(() => {
    const menu = ref.current!;
    const { height, width } = menu.getBoundingClientRect();
    setPos({
      top: at.bottom + height > innerHeight ? Math.max(8, at.top - height) : at.bottom,
      left: Math.min(at.left, innerWidth - width - 8),
    });
    menu.querySelector('button')?.focus();
  }, []);

  const visible = items.filter((i) => !i.hidden);
  return (
    <>
      <div class="backdrop" onPointerDown={onClose} />
      <div
        ref={ref}
        class="menu"
        role="menu"
        style={{ top: pos.top, left: pos.left }}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        {visible.map((item, i) => (
          <button
            key={item.label}
            role="menuitem"
            class={item.danger ? 'danger' : undefined}
            onClick={() => {
              if (item.confirm && confirming !== i) return setConfirming(i);
              onClose();
              item.onSelect();
            }}
          >
            {confirming === i ? item.confirm : item.label}
          </button>
        ))}
      </div>
    </>
  );
}
