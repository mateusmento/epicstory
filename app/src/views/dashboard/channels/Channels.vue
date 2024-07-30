<script setup lang="ts">
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  Field,
  Form,
  Label,
  RadioGroup,
  RadioGroupItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/design-system";
import {
  IconArrowDown,
  IconChannel,
  IconContacts,
  IconInbox,
  IconMention,
  IconSearch,
  IconThreads,
} from "@/design-system/icons";
import { useChannels } from "@/domain/channels/composables/channels";
import { ref } from "vue";
import InboxMessage from "./InboxMessage.vue";

const { channels, createChannel } = useChannels();

const channelType = ref("group");

const mock: any[] = [
  {
    id: 1,
    type: "direct",
    lastMessage: {
      id: 1,
      sender: { name: "Leon", picture: "/images/leon.png" },
      sentAt: "14min ago",
      content: "Leon is typing something...",
      unreadMessagesCount: 0,
    },
    speakingTo: { name: "Leon", picture: "/images/leon.png" },
  },
  {
    id: 2,
    type: "group",
    name: "#tech-help",
    picture: "/images/hashtag.svg",
    lastMessage: {
      id: 2,
      sender: { name: "Daiana", picture: "/images/daiana.png" },
      sentAt: "3h ago",
      content: "It seems to be a bug in latest version...",
      unreadMessagesCount: 2,
    },
    speakingTo: { name: "Leon", picture: "/images/leon.png" },
  },
  {
    id: 3,
    type: "direct",
    lastMessage: {
      id: 3,
      sender: { name: "Daiana", picture: "/images/daiana.png" },
      sentAt: "3h ago",
      content: "Hey, Mateus! The proposal is great and...",
      unreadMessagesCount: 1,
    },
    speakingTo: { name: "Daiana", picture: "/images/daiana.png" },
  },
  {
    id: 5,
    type: "direct",
    lastMessage: {
      id: 1,
      sender: { name: "Leon", picture: "/images/leon.png" },
      sentAt: "14min ago",
      content: "Leon is typing something...",
      unreadMessagesCount: 0,
    },
    speakingTo: { name: "Mateus", picture: "/images/leon.png" },
  },
];
</script>

<template>
  <Tabs class="flex:rows h-full" default-value="messages">
    <div class="p-4 flex:rows-xl mx-auto">
      <div class="flex:cols-auto flex:center-y mb-3">
        <div class="flex:cols-md flex:center-y text-xl text-zinc-800 font-semibold">
          <IconInbox />
          Inbox
        </div>
        <div class="flex:cols-md flex:center-y text-zinc-500 text-sm">
          Recent
          <IconArrowDown />
        </div>
      </div>
      <div
        class="flex:cols-md flex:center-y flex:center-x p-2 rounded-lg bg-neutral-200/60 text-zinc-500 text-sm"
      >
        <IconSearch /> Search
      </div>
      <TabsList class="w-full mt-4">
        <TabsTrigger value="messages" class="flex:cols-md">
          <IconContacts />
          Messages
        </TabsTrigger>
        <TabsTrigger value="mentions" class="flex:cols-md">
          <IconMention />
          Mentions
        </TabsTrigger>
        <TabsTrigger value="threads" class="flex:cols-md">
          <IconThreads />
          Threads
        </TabsTrigger>
      </TabsList>
    </div>
    <TabsContent value="messages" class="flex:rows self:fill">
      <InboxMessage v-for="channel of channels" :key="channel.id" :channel="channel" />

      <div class="w-fit mt-4 mx-auto text-xs text-zinc-500">You have no more messages</div>
      <Dialog>
        <DialogTrigger as-child>
          <Button
            legacy
            legacy-variant="primary"
            legacy-size="sm"
            class="flex:cols-md flex:center-y m-8 mt-auto ml-auto text-sm"
          >
            <IconChannel />
            Create Channel
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>Create channel</DialogHeader>
          <Form @submit="createChannel($event as any)" class="flex:rows-lg">
            <RadioGroup
              v-model="channelType"
              type="single"
              class="grid-cols-[auto_auto] gap-4 place-content-center"
            >
              <Label><RadioGroupItem value="direct" /> Direct</Label>
              <Label><RadioGroupItem value="group" /> Group</Label>
            </RadioGroup>
            <Field v-model="channelType" name="type" type="hidden" />
            <Field v-if="channelType === 'group'" label="Name" name="name" placeholder="Create channel..." />
            <Field v-if="channelType === 'direct'" label="Email" name="username" placeholder="Email..." />
            <Button size="xs">Create</Button>
          </Form>
        </DialogContent>
      </Dialog>
    </TabsContent>
    <TabsContent value="mentions"></TabsContent>
    <TabsContent value="threads"></TabsContent>
  </Tabs>
</template>
