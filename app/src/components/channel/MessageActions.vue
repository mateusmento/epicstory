<script lang="ts" setup>
import { Button, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/design-system";
import { Icon, IconReplies } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { messageBodyPlainText } from "@epicstory/tiptap";
import type { IMessage, IReply } from "@/domain/channels";
import { DotsHorizontalIcon } from "@radix-icons/vue";
import { computed, ref } from "vue";
import EmojiPicker from "./EmojiPicker.vue";
import { CopyIcon, SquarePen, Trash2Icon } from "lucide-vue-next";

const props = defineProps<{
  meId: number;
  senderId: number;
  message: IMessage | IReply;
}>();

const emit = defineEmits<{
  (e: "message-deleted"): void;
  (e: "emoji-selected", emoji: string): void;
  (e: "toggle-discussion"): void;
  (e: "quote"): void;
  (e: "edit"): void;
}>();

const sender = computed(() => (props.senderId === props.meId ? "me" : "someoneElse"));

const isReply = computed(() => "messageId" in props.message && props.message.messageId != null);

const canEditHere = computed(() => sender.value === "me" && !isReply.value);

const mostUsedEmojis = [
  "👍",
  "🙌",
  "❤️",
  // '🔥',
  // '🎉',
];

const messageActionsRef = ref<HTMLElement | null>(null);

async function copyMessage() {
  const text = messageBodyPlainText(props.message);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

defineExpose({
  getWidth: () => messageActionsRef.value?.clientWidth,
});
</script>

<template>
  <div :class="styles.messageActions" ref="messageActionsRef">
    <Button
      v-for="emoji in mostUsedEmojis"
      :key="emoji"
      variant="ghost"
      size="icon"
      class="w-8 h-8 text-lg"
      @click="emit('emoji-selected', emoji)"
    >
      {{ emoji }}
    </Button>

    <EmojiPicker @select="emit('emoji-selected', $event)" class="w-8 h-8 text-lg" />

    <Button variant="ghost" size="icon" class="w-8 h-8" @click="emit('toggle-discussion')">
      <IconReplies class="w-5 h-5 text-primary/40" />
    </Button>

    <Menu>
      <MenuTrigger as-child>
        <Button variant="ghost" size="icon" class="w-8 h-8">
          <DotsHorizontalIcon class="w-5 h-5" />
        </Button>
      </MenuTrigger>
      <MenuContent align="end" disabled-portal>
        <MenuItem @click="copyMessage">
          <CopyIcon class="w-5 h-5 text-muted-foreground" />
          <span>Copy message</span>
        </MenuItem>
        <MenuItem v-if="canEditHere" @click="emit('edit')">
          <SquarePen class="h-5 w-5 text-muted-foreground" />
          <span>Edit message</span>
        </MenuItem>
        <MenuItem @click="emit('quote')">
          <Icon name="fa-quote-right" class="w-5 h-5 text-muted-foreground" />
          <span>Quote message</span>
        </MenuItem>
        <template v-if="sender === 'me'">
          <MenuSeparator />
          <MenuItem @click="emit('message-deleted')" variant="destructive">
            <Trash2Icon name="fa-trash" class="w-5 h-5" />
            <span>Delete message</span>
          </MenuItem>
        </template>
      </MenuContent>
    </Menu>
  </div>
</template>

<script lang="ts">
const styles = {
  messageActions: cn(
    [
      "flex:row-md flex:center-y w-fit bg-white z-10",
      // "opacity-0 group-hover/message:opacity-100 transition-opacity",
      // "absolute top-0 right-0 translate-y-[-75%] mr-3",
      "border border-secondary rounded-xl shadow-sm p-md",
    ].join(" "),
  ),
};
</script>
