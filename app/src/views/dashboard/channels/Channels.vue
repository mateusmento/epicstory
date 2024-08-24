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
} from "@/design-system";
import {
  Icon,
  IconArrowDown,
  IconChannel,
  IconMention,
  IconSearch,
  IconThreads,
} from "@/design-system/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system/ui/tabs";
import { useChannel } from "@/domain/channels";
import { useChannels } from "@/domain/channels/composables/channels";
import { ref } from "vue";
import InboxMessage from "./InboxMessage.vue";

const { channels, createChannel } = useChannels();
const { channel: currentChannel } = useChannel();

const channelType = ref("group");
</script>

<template>
  <Tabs class="flex:rows h-full" default-value="messages">
    <div class="p-4 flex:rows-xl mx-auto">
      <div class="flex:cols-auto flex:center-y mb-3">
        <div class="flex:cols-sm flex:center-y text-lg text-zinc-800 font-medium">
          <Icon name="fa-slack-hash" scale="1.2" />
          Channels
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
          <Icon name="bi-person-lines-fill" />
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
      <InboxMessage
        v-for="channel of channels"
        :key="channel.id"
        :channel="channel"
        :open="!!currentChannel && currentChannel.id === channel.id"
      />

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
