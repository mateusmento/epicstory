<script lang="ts" setup>
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/design-system";
import { IconReplies } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { DotsHorizontalIcon } from "@radix-icons/vue";
import { computed } from "vue";
import EmojiPicker from "./EmojiPicker.vue";

const props = defineProps<{
  meId: number;
  senderId: number;
}>();

const emit = defineEmits<{
  (e: "message-deleted"): void;
  (e: "emoji-selected", emoji: string): void;
  (e: "toggle-discussion"): void;
}>();

const sender = computed(() => props.senderId === props.meId ? 'me' : 'someoneElse');
</script>

<template>
  <div :class="styles.messageActions">
    <Button variant="ghost" size="icon" class="w-8 h-8 text-lg" @click="emit('emoji-selected', '👍')">
      👍
    </Button>

    <Button variant="ghost" size="icon" class="w-8 h-8 text-lg" @click="emit('emoji-selected', '🙌')">
      🙌
    </Button>

    <EmojiPicker @select="emit('emoji-selected', $event)" class="w-8 h-8 text-lg" />

    <Button variant="ghost" size="icon" class="w-8 h-8" @click="emit('toggle-discussion')">
      <IconReplies class="w-5 h-5 text-primary/40" />
    </Button>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon" class="w-8 h-8">
          <DotsHorizontalIcon class="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem v-if="sender === 'me'" @click="emit('message-deleted')" variant="destructive">
          <span>Delete message</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>

<script lang="ts">
const styles = {
  messageActions: cn([
    "flex:row-md flex:center-y w-fit bg-white z-10 opacity-0 group-hover/message:opacity-100 transition-opacity",
    "absolute top-0 right-0 translate-y-[-75%] mr-3",
    "border border-secondary rounded-xl shadow-sm p-md",
  ].join(" "))
};
</script>
