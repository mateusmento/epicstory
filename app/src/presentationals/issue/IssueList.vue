<script lang="tsx">
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { withModifiers, type FunctionalComponent as FC } from "vue";

type HeadCellProps = {
  show: boolean;
  order: "asc" | "desc";
  label: string;
};

type HeadCellEmits = {
  click(): void;
  reset(): void;
};

export const BacklogHeadCell: FC<HeadCellProps, HeadCellEmits> = (
  { show, order, label },
  { emit, slots },
) => {
  return (
    <div
      class={cn("text-xs text-secondary-foreground select-none cursor-pointer flex:row-md flex:center-y", {
        "font-medium": show,
      })}
    >
      <span>{slots.default?.() ?? label}</span>
      <div class="group">
        <div class={cn("group-hover:hidden", { "opacity-0": !show })}>
          <Icon
            name={`hi-arrow-sm-${order === "asc" ? "down" : "up"}`}
            class="size-4 text-muted-foreground"
          />
        </div>
        <div
          class={cn("hidden group-hover:block", { "opacity-0": !show })}
          onClick={withModifiers(() => emit("reset"), ["stop"])}
        >
          <Icon name="io-close" class="size-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};
</script>

<script lang="tsx" setup>
import { computed } from "vue";

const GRID_COLS = "grid-cols-[16px_88px_1fr_100px_100px_110px_32px]";

const props = defineProps<{
  orderBy: string;
  order: "asc" | "desc";
  gridColsClass?: string;
}>();

const emit = defineEmits<{
  sort: [column: string];
  "reset-sort": [];
}>();

const effectiveGridCols = computed(() => props.gridColsClass ?? GRID_COLS);
</script>

<template>
  <div class="w-full h-full min-h-0 bg-card">
    <div class="flex flex-col w-full h-full min-h-0 bg-card overflow-hidden">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-card/90 backdrop-blur border-b pl-3 pr-6 py-1.5">
        <div class="flex items-center justify-between gap-4">
          <div class="grid gap-x-4 items-center flex-1 min-w-0" :class="effectiveGridCols">
            <div />
            <BacklogHeadCell
              label="Issue"
              :show="orderBy === 'status'"
              :order="order"
              @click="emit('sort', 'status')"
              @reset="emit('reset-sort')"
            />
            <BacklogHeadCell
              label="Title"
              :show="orderBy === 'title'"
              :order="order"
              @click="emit('sort', 'title')"
              @reset="emit('reset-sort')"
            />
            <BacklogHeadCell
              label="Priority"
              :show="orderBy === 'priority'"
              :order="order"
              @click="emit('sort', 'priority')"
              @reset="emit('reset-sort')"
            />
            <div class="text-sm text-secondary-foreground select-none">Assignees</div>
            <BacklogHeadCell
              label="Due Date"
              :show="orderBy === 'dueDate'"
              :order="order"
              @click="emit('sort', 'dueDate')"
              @reset="emit('reset-sort')"
            />
            <div />
          </div>
        </div>
      </div>

      <!-- List body: scroll content + optional viewport-fixed overlay (sibling, not inside scroll) -->
      <div class="relative flex-1 min-h-0 min-w-0">
        <div class="h-full overflow-y-auto overflow-x-hidden">
          <slot />
        </div>
        <slot name="overlay" />
      </div>
    </div>
  </div>
</template>
