import { DnDOperations, type IDnDStore } from "@vue-dnd-kit/core";

const DEBUG_SORTABLE = true;

const HYSTERESIS_PX = 6;
const lastSideByActiveAndOver = new Map<string, "before" | "after">();
const lastMoveByActive = new Map<string | number, { x: number; y: number; t: number }>();
const MOVE_COOLDOWN_MS = 120;
const MOVE_MIN_POINTER_DELTA_PX = 6;

function resolveList(source: any): any[] {
  if (Array.isArray(source)) return source;
  if (source && Array.isArray(source.value)) return source.value; // ref/reactive
  if (typeof source === "function") {
    const v = source();
    if (Array.isArray(v)) return v;
    if (v && Array.isArray(v.value)) return v.value;
  }
  return [];
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

  let draggingSource = resolveList(dragging?.data?.source);
  if (!draggingSource.some((x: any) => x?.id === activeId)) {
    draggingSource =
      [...store.zonesMap.value.values()]
        .map((x) => resolveList(x.data?.source))
        .find((x) => Array.isArray(x) && x.some((y: any) => y?.id === activeId)) ?? [];
  }

  // If we are over an element, insert before that element in its source list.
  if (overEl) {
    const overEntry = store?.elementsMap?.value?.get?.(overEl);
    const overId = overEntry?.id;
    const list = resolveList(overEntry?.data?.source);

    if (!Array.isArray(list)) {
      console.log("skipping because list is not an array", { list });
      return;
    }
    if (overId === undefined || overId === null) {
      console.log("skipping because overId is undefined or null", { overId });
      return;
    }
    if (overId === activeId) {
      console.log("skipping because overId === activeId", { overId, activeId });
      return;
    }

    const fromIndex = draggingSource?.findIndex((x: any) => x?.id === activeId);
    const toIndex = list.findIndex((x: any) => x?.id === overId);

    // Decide whether we should insert before or after the hovered element, based on pointer Y.
    const pointer = (store as any)?.pointerPosition?.current?.value ?? null;
    const overRect =
      typeof (overEl as any)?.getBoundingClientRect === "function"
        ? (overEl as any).getBoundingClientRect()
        : null;

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

    const shouldSkip =
      fromIndex < 0 ||
      toIndex < 0 ||
      (draggingSource === list && insertIndex === fromIndex);

    if (DEBUG_SORTABLE) {
      console.groupCollapsed(
        `[board-sortable] hover overEl active=${String(activeId)} over=${String(overId)} from=${fromIndex} to=${toIndex} insert=${insertIndex} side=${side}`,
      );
      console.log({ shouldSkip, fromIndex, toIndex, insertIndex, side, pointer, overRect, overEl });
      console.log("draggingSource ids:", draggingSource?.map?.((x: any) => x?.id));
      console.log("target list ids:", list?.map?.((x: any) => x?.id));
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
        console.groupCollapsed(
          `[board-sortable] after move active=${String(activeId)} (pointer=${x},${y})`,
        );
        console.log("draggingSource ids:", draggingSource?.map?.((v: any) => v?.id));
        console.log("target list ids:", list?.map?.((v: any) => v?.id));
        if (typeof x === "number" && typeof y === "number") {
          const els = document
            .elementsFromPoint(x, y)
            .filter((el) => !el.closest?.("#vue-dnd-kit-overlay"));
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
    const list = resolveList(zoneEntry?.data?.source);
    if (!Array.isArray(list)) return;
    if (draggingSource === list) return;

    const fromIndex = draggingSource?.findIndex((x: any) => x?.id === activeId);
    const toIndex = list.length; // end

    const shouldDrag = fromIndex < 0;
    console.log("overZone", { shouldDrag, fromIndex, toIndex });

    if (fromIndex < 0) return;

    DnDOperations.move(draggingSource, fromIndex, list, toIndex);
  }
}
