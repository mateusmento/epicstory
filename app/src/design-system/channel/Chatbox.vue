<script lang="ts" setup>
import Scrollable from "@/views/derbel/channel/Scrollable.vue";
import MessageGroup from "./MessageGroup.vue";
import type { IMessageGroup } from "./message-group.type";
import { Button } from "../ui/button";
import { IconSendMessage } from "../icons";
import { reactive, ref } from "vue";
import { useChannel } from "@/domain/channels";

const props = defineProps<{
  meId: number;
  messageGroups: IMessageGroup[];
}>();

const { sendMessage } = useChannel();

const message = reactive({ content: "" });
const messageTextEl = ref<HTMLElement | null>(null);

async function onSendMessage() {
  if (!message.content) return;
  await sendMessage(message);
  message.content = "";
}
</script>

<template>
  <div class="flex:rows h-full">
    <Scrollable class="self:fill min-h-0">
      <div class="p-4">
        <MessageGroup v-for="group of messageGroups" :key="group.id" :message-group="group" :me-id="meId" />
      </div>
    </Scrollable>
    <div class="p-4">
      <div class="p-2 border border-zinc-200 rounded-xl">
        <textarea
          v-model="message.content"
          class="w-full h-full rounded-md resize-none"
          ref="messageTextEl"
        />
        <div class="">
          <Button
            legacy
            legacy-variant="primary"
            legacy-size="sm"
            class="flex:cols-lg flex:center-y text-sm ml-auto"
            @click="onSendMessage"
          >
            <IconSendMessage />
            Send
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
