<script lang="ts" setup>
import { Menu, MenuContent, MenuTrigger } from "@/design-system";
import type { IMessage, IReply } from "@epicstory/contracts";
import MessageContextMenu from "./MessageContextMenu.vue";

withDefaults(
  defineProps<{
    meId: number;
    senderId: number;
    message: IMessage | IReply;
    allowQuote?: boolean;
    allowShareToChannel?: boolean;
  }>(),
  { allowQuote: true, allowShareToChannel: false },
);

const emit = defineEmits<{
  (e: "message-deleted"): void;
  (e: "emoji-selected", emoji: string): void;
  (e: "toggle-discussion"): void;
  (e: "quote"): void;
  (e: "edit"): void;
}>();
</script>

<template>
  <Menu type="context-menu">
    <MenuTrigger as-child>
      <slot />
    </MenuTrigger>
    <MenuContent class="font-dmSans">
      <MessageContextMenu
        :meId="meId"
        :senderId="senderId"
        :message="message"
        :allow-quote="allowQuote"
        :allow-share-to-channel="allowShareToChannel"
        @message-deleted="emit('message-deleted')"
        @emoji-selected="emit('emoji-selected', $event)"
        @toggle-discussion="emit('toggle-discussion')"
        @quote="emit('quote')"
        @edit="emit('edit')"
      >
        <template v-if="$slots['share-submenu']" #share-submenu>
          <slot name="share-submenu" />
        </template>
      </MessageContextMenu>
    </MenuContent>
  </Menu>
</template>
