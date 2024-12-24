<script lang="ts" setup>
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Combobox, Form } from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { User } from "@/domain/auth";
import { useChannel } from "@/domain/channels";
import { useUsers } from "@/domain/user";
import Scrollable from "@/components/meeting/Scrollable.vue";
import IconAcceptCall from "@/components/icons/IconAcceptCall.vue";
import { reactive, ref, watch } from "vue";
import ChatboxTopbar from "./ChatboxTopbar.vue";
import MessageBox from "./MessageBox.vue";
import MessageGroup from "./MessageGroup.vue";
import MessageWriter from "./MessageWriter.vue";
import type { IMessageGroup } from "./types";

defineProps<{
  meId: number;
  chatTitle?: string;
  chatPicture?: string;
  messageGroups: IMessageGroup[];
}>();

const emit = defineEmits(["join-meeting"]);

const { channel, sendMessage, members, addMember } = useChannel();

const open = defineModel<boolean>("open");

const message = reactive({ content: "" });

async function onSendMessage() {
  if (!message.content) return;
  await sendMessage(message);
  message.content = "";
}

const { users, fetchUsers } = useUsers();
const query = ref("");
const selectedUser = ref<User>();
watch(query, () => fetchUsers(query.value));
</script>

<template>
  <div v-if="channel" class="flex:rows h-full">
    <ChatboxTopbar :chatTitle="chatTitle" :chatPicture="chatPicture" @more-details="open = !open">
      <button @click="emit('join-meeting')" class="p-2 ml-auto border-none rounded-full bg-green">
        <IconAcceptCall />
      </button>
    </ChatboxTopbar>

    <div class="flex:cols self:fill min-h-0">
      <Scrollable class="self:fill min-h-0">
        <div class="flex:rows-xl p-4">
          <MessageGroup
            v-for="group of messageGroups"
            :key="group.id"
            :sender="group.senderId === meId ? 'me' : 'someoneElse'"
            :message-group="group"
          >
            <MessageBox v-for="message of group.messages" :key="message.id" :content="message.content" />
          </MessageGroup>
        </div>
      </Scrollable>

      <Collapsible as-child :open="open">
        <CollapsibleContent
          as="aside"
          transition="horizontal"
          class="h-full w-96 border-r border-r-zinc-300/60"
        >
          <Collapsible class="p-3">
            <div class="flex:cols-auto flex:center-y">
              <h1 class="flex:cols-md flex:center-y text-lg font-medium whitespace-nowrap">
                <Icon name="bi-people-fill" />
                Members
              </h1>
              <CollapsibleTrigger as-child>
                <Button variant="outline" size="badge" class="block ml-auto">Add member</Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <Form @submit="selectedUser && addMember(selectedUser.id)" class="flex:rows-lg pt-4">
                <Combobox
                  v-model="selectedUser"
                  v-model:searchTerm="query"
                  :options="users"
                  track-by="id"
                  label-by="name"
                />
                <Button type="submit" size="xs">Add</Button>
              </Form>
            </CollapsibleContent>
          </Collapsible>
          <div>
            <div
              v-for="member in members"
              :key="member.id"
              class="flex:cols-lg p-3 border-t hover:bg-zinc-200/60 cursor-pointer"
            >
              <img :src="member.picture" class="w-10 h-10 rounded-full" />
              <div class="flex:rows-md">
                <div class="text-base font-medium font-dmSans whitespace-nowrap">{{ member.name }}</div>
                <div class="text-xs text-zinc-500 whitespace-nowrap">{{ member.email }}</div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>

    <div class="p-4">
      <MessageWriter v-model:message-content="message.content" @send-message="onSendMessage" />
    </div>
  </div>
</template>

<style scoped>
.bg-green {
  background-color: #57ca4d;
}
</style>
