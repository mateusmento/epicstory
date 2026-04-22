<script lang="ts" setup>
import { Button, type ButtonVariants, ScrollArea } from "@/design-system";
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/ui/popover";
import { SmilePlusIcon } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { ref } from "vue";
import { emojis } from "./emojis";

const props = defineProps<{
  variant?: ButtonVariants["variant"];
  size?: ButtonVariants["size"];
  class?: HTMLAttributes["class"];
}>();

// Destructure props to avoid reserved keyword issues
const { variant, size, class: className } = props;

const emit = defineEmits<{
  select: [emoji: string];
}>();

const isOpen = ref(false);

function handleEmojiSelect(emoji: string) {
  emit("select", emoji);
  isOpen.value = false;
}
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <Button :variant="variant || 'ghost'" :size="size || 'icon'" :class="className">
        <SmilePlusIcon class="w-5 h-5 text-primary/40" />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="w-80 p-2 bg-white z-[80] shadow-sm border border-secondary rounded-lg"
      align="start"
      disabled-portal
    >
      <ScrollArea class="h-60 flex-1 min-h-0">
        <div class="!grid grid-cols-8 gap-1">
          <button
            v-for="emoji in emojis"
            :key="emoji"
            @click="handleEmojiSelect(emoji)"
            class="flex items-center justify-center p-2 rounded hover:bg-secondary transition-colors text-lg cursor-pointer"
            :title="emoji"
          >
            {{ emoji }}
          </button>
        </div>
      </ScrollArea>
    </PopoverContent>
  </Popover>
</template>
