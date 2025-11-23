<script lang="ts" setup>
import { ref } from "vue";
import { Icon } from "@/design-system/icons";
import { Button } from "@/design-system/ui/button";
import { Separator } from "@/design-system/ui/separator";
import { vTextareaAutosize } from "@/design-system/directives";
import { startRecording } from "@/core/screen-recording";

const emit = defineEmits<{
  (e: "send-message", value: { content: string }): void;
}>();

const messageContent = defineModel<string>("messageContent");
const messageTextEl = ref<HTMLElement | null>(null);

function onSendMessage() {
  emit("send-message", { content: messageContent.value ?? "" });
  messageContent.value = "";
}

const isRecording = ref(false);
const stopRecording = ref<(() => void) | null>(null);

const secondsElapsed = ref(0);
const counter = ref<ReturnType<typeof setInterval> | null>(null);

async function onToggleRecording(e: MouseEvent) {
  if (!isRecording.value) {
    secondsElapsed.value = 0;
    isRecording.value = true;
    stopRecording.value = await startRecording();
    counter.value = setInterval(() => {
      secondsElapsed.value++;
    }, 1000);
  } else {
    counter.value && clearInterval(counter.value);
    counter.value = null;
    stopRecording.value?.();
    stopRecording.value = null;
    isRecording.value = false;
  }
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
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

    <div class="flex:row-xl flex:center-y text-secondary-foreground">
      <Button variant="ghost" size="icon" @click="onToggleRecording">
        <Icon v-if="!isRecording" name="bi-camera-video" class="w-6 h-6" />
        <template v-else>
          <Icon name="ri-record-circle-fill" class="w-6 h-6 text-red-500" />
          <span class="text-xs ml-1 text-red-400">{{ formatTime(secondsElapsed) }}</span>
        </template>
      </Button>
      <Button variant="ghost" size="icon">
        <Icon name="bi-mic" class="w-6 h-6" />
      </Button>
      <Separator orientation="vertical" class="h-8 bg-zinc-300" />
      <Button variant="ghost" size="icon">
        <Icon name="co-smile" class="w-6 h-6" />
      </Button>
      <Button variant="ghost" size="icon">
        <Icon name="oi-mention" class="w-6 h-6" />
      </Button>
      <Button variant="ghost" size="icon">
        <Icon name="bi-image" class="w-6 h-6" />
      </Button>
      <Button variant="ghost" size="icon">
        <Icon name="ri-attachment-2" class="w-6 h-6" />
      </Button>

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
