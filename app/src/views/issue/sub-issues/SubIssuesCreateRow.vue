<script setup lang="ts">
import { Button, Input } from "@/design-system";
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
  <div class="flex items-center gap-2 px-2">
    <Button
      size="icon"
      variant="outline"
      class="size-5 rounded-full text-muted-foreground"
      title="Create sub-issue"
      :disabled="disabled"
      @click="emit('create')"
    >
      <Icon name="hi-plus" class="w-3 h-3" />
    </Button>

    <Input
      :id="inputId ?? 'new-sub-issue'"
      v-model="title"
      size="sm"
      placeholder="Add sub-issue…"
      class="border-transparent shadow-none bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
      :disabled="disabled || isCreating"
      @keydown.enter.prevent="emit('create')"
    />
  </div>
</template>
