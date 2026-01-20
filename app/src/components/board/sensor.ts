import type { IDnDStore } from "@vue-dnd-kit/core";

// Pointer-based collision detection (instead of dragged-rect overlap).
export function pointerSensor(store: IDnDStore) {
  const { x, y } = store?.pointerPosition?.current?.value ?? { x: 0, y: 0 };

  // Ignore the overlay portal itself so we detect underlying list items/zones.
  const els = document.elementsFromPoint(x, y).filter((el) => !el.closest?.("#vue-dnd-kit-overlay"));

  return els.length ? els : null;
}
