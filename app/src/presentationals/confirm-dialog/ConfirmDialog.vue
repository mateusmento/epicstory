<script lang="ts" setup>
import { Button, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/design-system";

defineProps<{
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  disabled?: boolean;
}>();

defineEmits<{ (e: "confirm"): void; (e: "cancel"): void }>();
</script>

<template>
  <DialogHeader>
    <DialogTitle>{{ title }}</DialogTitle>
    <DialogDescription v-if="description">
      {{ description }}
    </DialogDescription>
  </DialogHeader>

  <DialogFooter class="mt-2">
    <Button type="button" variant="outline" :disabled="disabled" @click="$emit('cancel')">
      {{ cancelLabel }}
    </Button>
    <Button
      type="button"
      :variant="destructive ? 'destructive' : 'default'"
      :disabled="disabled"
      @click="$emit('confirm')"
    >
      {{ confirmLabel }}
    </Button>
  </DialogFooter>
</template>
