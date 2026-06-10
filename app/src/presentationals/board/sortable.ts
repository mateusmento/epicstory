import { DnDOperations, type IDnDStore } from "@vue-dnd-kit/core";
import {
  findItemIndexById,
  readElementClientRect,
  readPointerPosition,
  resolveSortableList,
  type SortableListItem,
} from "./board-dnd-types";

const DEBUG_SORTABLE = true;

const HYSTERESIS_PX = 6;
const lastSideByActiveAndOver = new Map<string, "before" | "after">();
const lastMoveByActive = new Map<string | number, { x: number; y: number; t: number }>();
const MOVE_COOLDOWN_MS = 120;
const MOVE_MIN_POINTER_DELTA_PX = 6;

function listHasItemWithId(list: SortableListItem[], id: string | number): boolean {
  return findItemIndexById(list, id) >= 0;
}

/**
 * More stable than DnDOperations.applyTransfer for sortable lists:
 * - uses draggable `id` values to compute indices at the moment of hover/drop
 * - avoids stale `data.index` issues when the array is mutated during drag
 *
 * Assumes list items have shape: { id: string|number, ... }
 */
export function applySortableTransferById(store: IDnDStore) {
  const overEl = store?.hovered?.element?.value ?? null;
  const overZone = store?.hovered?.zone?.value ?? null;

  const dragging = store?.draggingElements?.value?.values?.().next?.().value ?? null;

  const activeId = dragging?.id;
  if (activeId === undefined || activeId === null) return;

  let draggingSource = resolveSortableList(dragging?.data?.source);
  if (!listHasItemWithId(draggingSource, activeId)) {
    draggingSource =
      [...store.zonesMap.value.values()]
        .map((zone) => resolveSortableList(zone.data?.source))
        .find((list) => listHasItemWithId(list, activeId)) ?? [];
  }

  // If we are over an element, insert before that element in its source list.
  if (overEl) {
    const overEntry = store?.elementsMap?.value?.get?.(overEl);
    const overId = overEntry?.id;
    const list = resolveSortableList(overEntry?.data?.source);

    if (overId === undefined || overId === null) {
      console.log("skipping because overId is undefined or null", { overId });
      return;
    }
    if (overId === activeId) {
      console.log("skipping because overId === activeId", { overId, activeId });
      return;
    }

    const fromIndex = findItemIndexById(draggingSource, activeId);
    const toIndex = findItemIndexById(list, overId);

    const pointer = readPointerPosition(store);
    const overRect = readElementClientRect(overEl);

    // Hard stabilization against "ping-pong" oscillation:
    // After we mutate arrays (move), the DOM under the pointer can change and flip `overId`
    // even if the pointer doesn't move (especially with TransitionGroup transforms).
    // If the pointer hasn't moved enough since the last move for this activeId, skip.
    if (typeof pointer?.x === "number" && typeof pointer?.y === "number") {
      const prev = lastMoveByActive.get(activeId);
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (prev && now - prev.t < MOVE_COOLDOWN_MS) {
        const dx = Math.abs(pointer.x - prev.x);
        const dy = Math.abs(pointer.y - prev.y);
        if (dx + dy < MOVE_MIN_POINTER_DELTA_PX) {
          if (DEBUG_SORTABLE) {
            console.log("[board-sortable] skip (cooldown/no-pointer-move)", {
              activeId,
              overId,
              dx,
              dy,
              dt: now - prev.t,
            });
          }
          return;
        }
      }
    }

    const midY = overRect ? overRect.top + overRect.height / 2 : null;
    const key = `${String(activeId)}::${String(overId)}`;

    let side: "before" | "after" = "before";
    if (typeof pointer?.y === "number" && typeof midY === "number") {
      if (pointer.y < midY - HYSTERESIS_PX) side = "before";
      else if (pointer.y > midY + HYSTERESIS_PX) side = "after";
      else side = lastSideByActiveAndOver.get(key) ?? "before";
    } else {
      side = lastSideByActiveAndOver.get(key) ?? "before";
    }

    // Important UX stabilization:
    // Within the same list, users usually expect "hover an item => take its slot".
    // That corresponds to:
    // - dragging down (fromIndex < toIndex): behave like "after" (swap forward)
    // - dragging up (fromIndex > toIndex): behave like "before" (swap backward)
    // This also reduces oscillation because the side won't flip just due to DOM reflow.
    if (draggingSource === list && fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
      side = fromIndex < toIndex ? "after" : "before";
    }
    lastSideByActiveAndOver.set(key, side);

    if (draggingSource !== list) {
      console.log("draggingSource !== list, setting side to before", { draggingSource, list });
      side = "before";
    }

    // Convert "hovered item index" into "insertion index".
    let insertIndex = toIndex + (side === "after" ? 1 : 0);
    // If moving within the same list, removing the item shifts indices.
    if (draggingSource === list && fromIndex >= 0 && insertIndex > fromIndex) {
      insertIndex -= 1;
    }

    const shouldSkip = fromIndex < 0 || toIndex < 0 || (draggingSource === list && insertIndex === fromIndex);

    if (DEBUG_SORTABLE) {
      console.groupCollapsed(
        `[board-sortable] hover overEl active=${String(activeId)} over=${String(overId)} from=${fromIndex} to=${toIndex} insert=${insertIndex} side=${side}`,
      );
      console.log({ shouldSkip, fromIndex, toIndex, insertIndex, side, pointer, overRect, overEl });
      console.log(
        "draggingSource ids:",
        draggingSource.map((item) => item.id),
      );
      console.log(
        "target list ids:",
        list.map((item) => item.id),
      );
      console.groupEnd();
    } else {
      console.log("overEl", { shouldSkip, fromIndex, toIndex, insertIndex, side });
    }

    if (fromIndex < 0 || toIndex < 0) {
      console.log("skipping because fromIndex < 0 or toIndex < 0", { fromIndex, toIndex });
      return;
    }
    // Prevent the classic "ping-pong": if we'd be inserting the item where it already is, do nothing.
    if (draggingSource === list && insertIndex === fromIndex) {
      console.log("skipping because insertIndex === fromIndex", { insertIndex, fromIndex });
      return;
    }

    // Clamp insertion index to valid range.
    if (insertIndex < 0) insertIndex = 0;
    if (insertIndex > list.length) insertIndex = list.length;

    console.log("moving", { fromIndex, list, insertIndex });
    DnDOperations.move(draggingSource, fromIndex, list, insertIndex);

    if (typeof pointer?.x === "number" && typeof pointer?.y === "number") {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      lastMoveByActive.set(activeId, { x: pointer.x, y: pointer.y, t: now });
    }

    if (DEBUG_SORTABLE) {
      const x = pointer?.x;
      const y = pointer?.y;
      requestAnimationFrame(() => {
        console.groupCollapsed(`[board-sortable] after move active=${String(activeId)} (pointer=${x},${y})`);
        console.log(
          "draggingSource ids:",
          draggingSource.map((item) => item.id),
        );
        console.log(
          "target list ids:",
          list.map((item) => item.id),
        );
        if (typeof x === "number" && typeof y === "number") {
          const els = document.elementsFromPoint(x, y).filter((el) => !el.closest?.("#vue-dnd-kit-overlay"));
          console.log("elementsFromPoint (filtered):", els.slice(0, 6));
        }
        console.groupEnd();
      });
    }
    return;
  }

  // If we are over the zone but not any element, move to the end of that zone list.
  if (overZone) {
    const zoneEntry = store?.zonesMap?.value?.get?.(overZone);
    const list = resolveSortableList(zoneEntry?.data?.source);
    if (draggingSource === list) return;

    const fromIndex = findItemIndexById(draggingSource, activeId);
    const toIndex = list.length;

    const shouldDrag = fromIndex < 0;
    console.log("overZone", { shouldDrag, fromIndex, toIndex });

    if (fromIndex < 0) return;

    DnDOperations.move(draggingSource, fromIndex, list, toIndex);
  }
}
