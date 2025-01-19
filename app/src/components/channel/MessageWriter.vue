<script lang="ts" setup>
import { ref } from "vue";
import { Icon } from "@/design-system/icons";
import { Button } from "@/design-system/ui/button";
import { Separator } from "@/design-system/ui/separator";
import { vTextareaAutosize } from "@/design-system/directives";

const emit = defineEmits<{
  (e: "send-message", value: { content: string }): void;
}>();

const messageContent = defineModel<string>("messageContent");
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
      v-textarea-autosize
      min-rows="2"
      max-rows="10"
      placeholder="Send a message to channel..."
      class="w-full h-full px-2 text-sm rounded-md resize-none outline-none"
      ref="messageTextEl"
      @keydown.ctrl.enter="onSendMessage"
    />

    <div class="flex:row-xl flex:center-y text-zinc-500">
      <Icon name="bi-camera-video" class="w-6 h-6" />
      <Icon name="bi-mic" class="w-6 h-6" />
      <Separator orientation="vertical" class="h-8 bg-zinc-300" />
      <Icon name="co-smile" class="w-6 h-6" />
      <Icon name="oi-mention" class="w-6 h-6" />
      <Icon name="bi-image" class="w-6 h-6" />
      <Icon name="ri-attachment-2" class="w-6 h-6" />

      <div class="flex-1"></div>

      <Button
        legacy
        legacy-variant="primary"
        legacy-size="sm"
        class="flex:row-lg flex:center-y text-sm bg-[#3A66FF]"
        @click="onSendMessage"
      >
        <Icon name="io-paper-plane" />
        <!-- <Icon name="bi-send-fill" /> -->
        Send
      </Button>
    </div>
  </div>
</template>
