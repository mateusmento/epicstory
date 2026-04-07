<script setup lang="ts">
import { Button, Input } from "@/design-system";
import { Icon, IconSearch } from "@/design-system/icons";
import { Loader2Icon } from "lucide-vue-next";
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    loading?: boolean;
    placeholder?: string;
    clearTitle?: string;
  }>(),
  {
    loading: false,
    placeholder: "Search",
    clearTitle: "Clear search",
  },
);

const emit = defineEmits<{
  (e: "focus"): void;
  (e: "blur"): void;
  (e: "clear"): void;
}>();

const modelValue = defineModel<string>({ default: "" });
const focused = defineModel<boolean>("focused", { default: false });

const root = ref<HTMLElement | null>(null);
const showActions = computed(() => focused.value || modelValue.value.trim().length > 0);

function onFocus() {
  focused.value = true;
  emit("focus");
}

function onBlur() {
  focused.value = false;
  emit("blur");
}

function clearSearch() {
  modelValue.value = "";
  emit("clear");
}

function blur() {
  root.value?.querySelector("input")?.blur();
}

defineExpose({ blur });
</script>

<template>
  <div
    ref="root"
    class="relative flex:row-md flex:center-y rounded-lg border border-border bg-background text-xs"
  >
    <IconSearch
      class="pointer-events-none absolute left-2.5 top-1/2 z-0 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
    />
    <Input
      v-model="modelValue"
      :placeholder="props.placeholder"
      class="h-8 w-full rounded-md border-0 bg-transparent pl-8 text-xs shadow-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
      :class="showActions ? 'pr-9' : 'pr-3'"
      @focus="onFocus"
      @blur="onBlur"
    />
    <div v-if="showActions" class="absolute right-2 top-1/2 z-10 -translate-y-1/2">
      <Loader2Icon v-if="props.loading" class="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      <Button
        v-else
        class="p-0.5"
        type="button"
        variant="secondary"
        size="icon"
        :title="props.clearTitle"
        @mousedown.prevent
        @click="clearSearch"
      >
        <Icon name="io-close" class="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </Button>
    </div>
  </div>
</template>
