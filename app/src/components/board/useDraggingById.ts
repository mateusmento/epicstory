import { computed } from "vue";
import { useDnDStore } from "@vue-dnd-kit/core";

export function useDraggingById() {
  const store = useDnDStore();

  const activeId = computed<string | number | null>(() => {
    return store.draggingElements.value.values().next().value?.id ?? null;
  });

  function isDragging(id: string | number) {
    return store.isDragging.value && activeId.value === id;
  }

  return { activeId, isDragging };
}

