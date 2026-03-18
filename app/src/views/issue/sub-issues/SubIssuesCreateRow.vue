<script setup lang="ts">
import { Input } from "@/design-system";
import { Icon } from "@/design-system/icons";

const title = defineModel<string>({ default: "" });

const props = defineProps<{
  disabled?: boolean;
  isCreating?: boolean;
  inputId?: string;
}>();

const emit = defineEmits<{
  (e: "create"): void;
}>();
</script>

<template>
  <div class="flex items-center gap-2 px-3 py-2 border-b">
    <button
      type="button"
      class="w-4 h-4 rounded-full ring-1 ring-border bg-white grid place-items-center text-muted-foreground"
      title="Create sub-issue"
      :disabled="disabled"
      @click="emit('create')"
    >
      <Icon name="hi-plus" class="w-3 h-3" />
    </button>

    <Input
      :id="inputId ?? 'new-sub-issue'"
      v-model="title"
      size="sm"
      placeholder="Add sub-issue…"
      class="border-transparent shadow-none bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
      :disabled="disabled || isCreating"
      @keydown.enter.prevent="emit('create')"
    />

    <div class="flex-1" />
    <div class="text-xs text-muted-foreground" v-if="isCreating">Adding…</div>
  </div>
</template>

