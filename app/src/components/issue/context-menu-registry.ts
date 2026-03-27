type CloseFn = () => void;

const registry = new Map<number, CloseFn>();

export function registerContextMenu(menuId: number, close: CloseFn) {
  registry.set(menuId, close);
  return () => {
    const current = registry.get(menuId);
    if (current === close) registry.delete(menuId);
  };
}

export function closeAllContextMenusExcept(menuId: number) {
  for (const [id, close] of registry) {
    if (id === menuId) continue;
    close();
  }
}
