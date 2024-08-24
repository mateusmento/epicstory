<script lang="ts" setup>
import { ref } from "vue";
import { Icon } from "../icons";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

const emit = defineEmits<{
  (e: "send-message", value: { content: string }): void;
}>();

const messageContent = defineModel<string>("message-content");
const messageTextEl = ref<HTMLElement | null>(null);

function onSendMessage() {
  emit("send-message", { content: messageContent.value ?? "" });
  messageContent.value = "";
}
</script>

<template>
  <div
    class="p-3 border border-zinc-200 rounded-xl focus-within:outline outline-1 outline-zinc-300/60"
    @click="messageTextEl?.focus()"
  >
    <textarea
      v-model="messageContent"
      placeholder="Send a message to channel..."
      class="w-full h-full px-2 rounded-md resize-none outline-none"
      ref="messageTextEl"
    />

    <div class="flex:cols-xl flex:center-y text-zinc-500">
      <Icon name="bi-camera-video" class="w-6 h-6" />
      <Icon name="bi-mic" class="w-6 h-6" />
      <Separator orientation="vertical" class="h-8 bg-zinc-300" />
      <Icon name="co-smile" class="w-6 h-6" />
      <Icon name="oi-mention" class="w-6 h-6" />
      <Icon name="bi-image" class="w-6 h-6" />
      <Icon name="ri-attachment-2" class="w-6 h-6" />

      <div class="self:fill"></div>

      <Button
        legacy
        legacy-variant="primary"
        legacy-size="sm"
        class="flex:cols-lg flex:center-y text-sm bg-[#3A66FF]"
        @click="onSendMessage"
      >
        <Icon name="io-paper-plane" />
        <!-- <Icon name="bi-send-fill" /> -->
        Send
      </Button>
    </div>
  </div>
</template>
