<script lang="ts" setup>
import { Button, ScrollArea, Separator } from "@/design-system";
import type { IChannel, IMessageGroup } from "@/domain/channels";
import { HashIcon, HeadphonesIcon } from "lucide-vue-next";
import Message from "./Message.vue";
import MessageGroup from "./MessageGroup.vue";
import MessageWriter from "./MessageWriter.vue";

const props = defineProps<{
  meId: number;
  chatTitle?: string;
  chatPicture?: string;
  messageGroups: IMessageGroup[];
  sendMessage: (message: { content: string; contentRich: any }) => Promise<void>;
  channelId: number;
  channel: IChannel;
}>();

const emit = defineEmits(["join-meeting", "more-details", "message-deleted"]);

async function onSendMessage(payload: { content: string; contentRich: any }) {
  if (!payload.content) return;
  await props.sendMessage(payload);
}

function onMessageDeleted(messageId: number) {
  emit("message-deleted", messageId);
}
</script>

<template>
  <div class="grid grid-rows-[auto_auto_1fr_auto] h-full">
    <div class="flex:row-lg flex:center-y p-2 h-10">
      <HashIcon class="h-5 w-5 text-muted-foreground" stroke-width="2.5" />
      <div class="text-sm" @click="emit('more-details')">{{ chatTitle }}</div>

      <Button
        size="icon"
        variant="outline"
        @click="emit('join-meeting')"
        class="p-1 ml-auto text-muted-foreground"
        title="Join meeting"
      >
        <HeadphonesIcon class="w-4 h-4" />
      </Button>
    </div>

    <Separator />

    <div class="relative min-h-0">
      <ScrollArea class="min-h-0 h-full" bottom>
        <div class="flex:col-xl !flex justify-end p-4 min-h-full pb-14">
          <div class="flex:col-3xl p-xl mb-2xl">
            <div class="flex:row-xl flex:center-y gap-2">
              <img
                v-for="member of channel.peers"
                :key="member.id"
                :src="member.picture"
                class="w-18 h-18 -ml-10 first:ml-0 rounded-full"
              />
            </div>
            <div class="text-xl text-accent-foreground font-lato">
              This is the begining of a conversation between
              <template v-for="(member, i) of channel.peers" :key="member.id">
                <template v-if="i > 0 && i < channel.peers.length - 1">, </template>
                <template v-else-if="i > 0"> and </template>
                <span class="bg-[#c7f9ff] p-1 rounded-lg text-[#008194] font-bold">
                  @{{ member.name }}
                </span> </template
              >.
            </div>
          </div>

          <MessageGroup
            v-for="group of messageGroups"
            :key="group.id"
            :sender="group.sender"
            :meId="meId"
            :sentAt="group.sentAt"
          >
            <Message
              v-for="message of group.messages"
              :key="message.id"
              :message
              :meId
              @message-deleted="onMessageDeleted"
            />
          </MessageGroup>
        </div>
      </ScrollArea>

      <div class="absolute bottom-0 left-0 right-0 mx-7 z-[10]">
        <div
          class="px-2 py-1 border border-b-0 border-muted rounded-lg rounded-b-none text-xs bg-zinc-50 text-muted-foreground"
        >
          {{ chatTitle }} is typing something...
        </div>
      </div>
    </div>

    <MessageWriter
      :mentionables="channel.peers"
      :me-id="meId"
      @send-message="onSendMessage"
      class="m-4 mt-0 bg-red-transparent"
    />
  </div>
</template>

<style scoped>
.bg-green {
  background-color: #57ca4d;
}
</style>
