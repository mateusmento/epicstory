import { onBeforeUnmount, onMounted, watch, type Ref } from "vue";
import uniqid from "uniqid";

type CloseFn = () => void;

const registry = new Map<string, CloseFn>();

function registerContextMenuInstance(menuId: string, close: CloseFn) {
  registry.set(menuId, close);
  closeAllContextMenuInstancesExcept(menuId);
  return () => {
    const current = registry.get(menuId);
    if (current === close) registry.delete(menuId);
  };
}

function closeAllContextMenuInstancesExcept(menuId: string) {
  for (const [id, close] of registry) {
    if (id === menuId) continue;
    close();
  }
}

/** Close every registered context menu (e.g. primary pointer on another row’s trigger). */
export function closeAllContextMenuInstances() {
  for (const [, close] of registry) {
    close();
  }
}

/** Ensures only one `Menu` with `type="context-menu"` is open at a time (app-wide). */
export function useSingleContextMenuInstance(
  open: Ref<boolean | undefined | null | undefined>,
  close: CloseFn,
) {
  const menuId = uniqid("ctx-menu-");
  let unregister: (() => void) | undefined;

  onMounted(() => {
    unregister = registerContextMenuInstance(menuId, close);
  });
  onBeforeUnmount(() => unregister?.());

  watch(
    open,
    (isOpen) => {
      if (isOpen) closeAllContextMenuInstancesExcept(menuId);
    },
    { immediate: true },
  );
}
