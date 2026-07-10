<script lang="ts" setup>
import {
  Button,
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  ScrollArea,
  type ButtonVariants,
} from "@/design-system";
import { formatTimeDisplay, timeSlotsIncluding } from "@/lib/schedule";
import { ChevronDown } from "lucide-vue-next";
import type { AcceptableValue } from "reka-ui";
import { computed, nextTick, ref, useId, watch } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    /** Accessible name for the trigger */
    label: string;
    disabled?: boolean;
    size?: ButtonVariants["size"];
  }>(),
  { disabled: false, size: "sm" },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const open = ref(false);
const menuId = useId();
const scrollAreaRef = ref<{ getScrollElement: () => HTMLElement | null } | null>(null);
const slots = computed(() => timeSlotsIncluding(props.modelValue));

function onPick(v: AcceptableValue) {
  if (v == null || v === "") return;
  emit("update:modelValue", String(v));
}

function scrollSelectedIntoView() {
  const el = document.querySelector<HTMLElement>(
    `[data-time-menu="${menuId}"][data-time-slot="${props.modelValue}"]`,
  );
  const viewport = scrollAreaRef.value?.getScrollElement();
  if (!el || !viewport) {
    el?.scrollIntoView({ block: "center" });
    return;
  }
  const vRect = viewport.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  const delta = eRect.top - vRect.top - vRect.height / 2 + eRect.height / 2;
  viewport.scrollTop += delta;
}

watch(open, async (isOpen) => {
  if (!isOpen) return;
  await nextTick();
  requestAnimationFrame(() => {
    scrollSelectedIntoView();
  });
});
</script>

<template>
  <Menu v-model:open="open">
    <MenuTrigger as-child>
      <Button
        type="button"
        variant="outline"
        :size="props.size"
        class="min-w-[5.5rem] justify-between gap-1.5 font-normal tabular-nums"
        :disabled="props.disabled"
        :aria-label="props.label"
      >
        <span>{{ formatTimeDisplay(modelValue) }}</span>
        <ChevronDown class="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
      </Button>
    </MenuTrigger>
    <MenuContent align="start" class="w-28 p-1">
      <ScrollArea ref="scrollAreaRef" class="h-64">
        <div class="!flex !flex-col">
          <MenuRadioGroup :model-value="modelValue" @update:model-value="onPick">
            <MenuRadioItem
              v-for="slot in slots"
              :key="slot"
              :value="slot"
              :data-time-menu="menuId"
              :data-time-slot="slot"
              class="tabular-nums"
            >
              {{ formatTimeDisplay(slot) }}
            </MenuRadioItem>
          </MenuRadioGroup>
        </div>
      </ScrollArea>
    </MenuContent>
  </Menu>
</template>
