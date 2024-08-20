<script lang="ts" setup>
import { ref } from "vue";
import { Button } from "../ui/button";
import IconSendMessage from "../icons/IconSendMessage.vue";

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
    class="p-2 border border-zinc-200 rounded-xl focus-within:outline outline-1 outline-zinc-300/60"
    @click="messageTextEl?.focus()"
  >
    <textarea
      v-model="messageContent"
      class="w-full h-full px-2 rounded-md resize-none outline-none"
      ref="messageTextEl"
    />
    <div class="">
      <Button
        legacy
        legacy-variant="primary"
        legacy-size="sm"
        class="flex:cols-lg flex:center-y text-sm ml-auto bg-[#3A66FF]"
        @click="onSendMessage"
      >
        <IconSendMessage />
        Send
      </Button>
    </div>
  </div>
</template>
