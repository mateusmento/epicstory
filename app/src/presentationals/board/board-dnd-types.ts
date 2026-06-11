import type { IDnDStore } from "@vue-dnd-kit/core";
import type { Component, Ref } from "vue";

/** Minimum shape for sortable board lists (backlog items, etc.). */
export type SortableListItem = {
  id: string | number;
};

/** Undocumented store field used for pointer-Y hysteresis in sortable hover. */
export type DnDStoreWithPointer = IDnDStore & {
  pointerPosition?: {
    current?: Ref<{ x: number; y: number } | null | undefined>;
  };
};

export type DragOverlayData = {
  overlay?: {
    component?: Component;
    props?: Record<string, unknown>;
    render?: () => unknown;
    wrapperClass?: string;
  };
};

export function isSortableListItem(value: unknown): value is SortableListItem {
  return (
    value != null &&
    typeof value === "object" &&
    "id" in value &&
    (typeof (value as SortableListItem).id === "string" || typeof (value as SortableListItem).id === "number")
  );
}

export function resolveSortableList(source: unknown): SortableListItem[] {
  // Must return the original array reference (not a filtered copy) so DnDOperations.move
  // mutates the same reactive list that Vue renders.
  if (Array.isArray(source)) return source as SortableListItem[];
  if (source && typeof source === "object" && "value" in source) {
    const value = (source as Ref<unknown>).value;
    return Array.isArray(value) ? (value as SortableListItem[]) : [];
  }
  if (typeof source === "function") {
    return resolveSortableList(source());
  }
  return [];
}

export function readPointerPosition(store: IDnDStore): { x: number; y: number } | null {
  const pointer = (store as DnDStoreWithPointer).pointerPosition?.current?.value;
  if (pointer && typeof pointer.x === "number" && typeof pointer.y === "number") {
    return pointer;
  }
  return null;
}

export function readElementClientRect(element: Element | null): DOMRect | null {
  if (element && typeof element.getBoundingClientRect === "function") {
    return element.getBoundingClientRect();
  }
  return null;
}

export function findItemIndexById(list: SortableListItem[], id: string | number): number {
  return list.findIndex((item) => item.id === id);
}
