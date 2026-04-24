<script lang="ts" setup>
import {
  Button,
  Menu,
  MenuContent,
  MenuInput,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
  ScrollArea,
} from "@/design-system";
import { Icon, IconReplies } from "@/design-system/icons";
import type { IMessage, IReply } from "@/domain/channels";
import { messageBodyPlainText } from "@epicstory/tiptap";
import {
  CopyIcon,
  MessageSquareShare,
  MessageSquareShareIcon,
  SmilePlusIcon,
  SquarePen,
  Trash2Icon,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import { emojis } from "./emojis";

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

const isScheduled = computed(() => "isScheduled" in props.message && props.message.isScheduled);

const canEditHere = computed(() => sender.value === "me" && !isReply.value && !isScheduled.value);

const mostUsedEmojis = ["👍", "🙌", "❤️", "🔥", "🎉"];

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
  <Menu type="context-menu">
    <MenuTrigger as-child>
      <slot />
    </MenuTrigger>
    <MenuContent align="end" class="font-dmSans">
      <div class="flex:row gap-1 justify-center py-0">
        <Button
          v-for="emoji in mostUsedEmojis"
          :key="emoji"
          variant="ghost"
          size="icon"
          class="size-8 text-md"
          @click="emit('emoji-selected', emoji)"
        >
          {{ emoji }}
        </Button>
      </div>

      <MenuSeparator />

      <MenuSub>
        <MenuSubTrigger class="flex:row-md text-sm">
          <SmilePlusIcon class="size-4 text-muted-foreground" />
          <span>React with emoji</span>
        </MenuSubTrigger>
        <MenuSubContent class="bg-white z-[80] shadow-sm border border-secondary rounded-lg">
          <MenuInput placeholder="Search emoji…" class="text-lg" />
          <MenuSeparator />
          <ScrollArea class="h-80 flex-1 min-h-0 p-0">
            <div class="!grid grid-cols-8 gap-1 mr-3">
              <Button
                v-for="emoji in emojis"
                :key="emoji"
                variant="ghost"
                size="icon"
                @click="emit('emoji-selected', emoji)"
                class="p-2 size-11 cursor-pointer text-lg"
                :title="emoji"
              >
                {{ emoji }}
              </Button>
            </div>
          </ScrollArea>
        </MenuSubContent>
      </MenuSub>

      <MenuItem @click="emit('toggle-discussion')">
        <IconReplies class="text-muted-foreground" />
        <span>Reply message</span>
      </MenuItem>

      <MenuItem @click="copyMessage">
        <CopyIcon class="text-muted-foreground" />
        <span>Copy message</span>
      </MenuItem>
      <MenuItem v-if="canEditHere" @click="emit('edit')">
        <SquarePen class="text-muted-foreground" />
        <span>Edit message</span>
      </MenuItem>

      <MenuItem @click="emit('quote')">
        <MessageSquareShareIcon class="text-muted-foreground" />
        <span>Forward message</span>
      </MenuItem>

      <MenuItem @click="emit('quote')">
        <Icon name="fa-quote-right" class="text-muted-foreground" />
        <span>Quote message</span>
      </MenuItem>

      <template v-if="sender === 'me'">
        <MenuSeparator />
        <MenuItem @click="emit('message-deleted')" variant="destructive">
          <Trash2Icon name="fa-trash" class="" />
          <span>Delete message</span>
        </MenuItem>
      </template>
    </MenuContent>
  </Menu>
</template>
