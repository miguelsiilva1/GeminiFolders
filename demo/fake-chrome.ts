// In-memory stand-in for chrome.storage so the real panel runs in a plain page.
// Imported first: wxt/browser reads globalThis.chrome when it loads.
type Area = Map<string, unknown>;

function area(store: Area) {
  return {
    async get(keys?: string | string[] | null) {
      const list = keys == null ? [...store.keys()] : typeof keys === 'string' ? [keys] : keys;
      return Object.fromEntries(list.filter((k) => store.has(k)).map((k) => [k, structuredClone(store.get(k))]));
    },
    async set(items: Record<string, unknown>) {
      for (const [k, v] of Object.entries(items)) store.set(k, structuredClone(v));
    },
    async remove(keys: string | string[]) {
      for (const k of ([] as string[]).concat(keys)) store.delete(k);
    },
  };
}

const noop = { addListener() {}, removeListener() {} };

Object.assign(globalThis, {
  chrome: { runtime: { id: 'demo' }, storage: { local: area(new Map()), sync: area(new Map()), onChanged: noop } },
});
