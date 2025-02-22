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
import { useChannel, useMeeting, useSyncedChannels } from "@/domain/channels";
import { ref } from "vue";
import InboxMessage from "./InboxMessage.vue";

const channelType = ref("group");

const { channel: currentChannel } = useChannel();
const { channels, createChannel } = useSyncedChannels();
const { currentMeeting, joinMeeting } = useMeeting();
</script>

<template>
  <Tabs class="flex:col h-full w-96" default-value="messages">
    <div class="p-4 flex:col-xl mx-auto">
      <div class="flex:row-auto flex:center-y mb-3">
        <div class="flex:row-sm flex:center-y text-lg text-foreground font-medium">
          <Icon name="fa-slack-hash" scale="1.2" />
          Channels
        </div>
        <div class="flex:row-md flex:center-y text-secondary-foreground text-sm">
          Recent
          <IconArrowDown />
        </div>
      </div>
      <div class="flex:row-md flex:center p-2 rounded-lg bg-background text-secondary-foreground text-sm">
        <IconSearch /> Search
      </div>
      <TabsList class="w-full mt-4">
        <TabsTrigger value="messages" class="flex:row-md">
          <Icon name="bi-person-lines-fill" />
          Messages
        </TabsTrigger>
        <TabsTrigger value="mentions" class="flex:row-md">
          <IconMention />
          Mentions
        </TabsTrigger>
        <TabsTrigger value="threads" class="flex:row-md">
          <IconThreads />
          Threads
        </TabsTrigger>
      </TabsList>
    </div>
    <TabsContent value="messages" class="flex:col flex-1">
      <InboxMessage
        v-for="channel of channels"
        :key="channel.id"
        :channel="channel"
        :can-join-meeting="!!channel.meeting && channel.meeting.id !== currentMeeting?.id"
        @join-meeting="joinMeeting(channel)"
        :open="channel.id === currentChannel?.id"
      />

      <div class="w-fit mt-4 mx-auto text-xs text-secondary-foreground">You have no more messages</div>
      <Dialog>
        <DialogTrigger as-child>
          <Button
            legacy
            legacy-variant="primary"
            legacy-size="sm"
            class="flex:row-md flex:center-y m-8 mt-auto ml-auto text-sm"
          >
            <IconChannel />
            Create Channel
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>Create channel</DialogHeader>
          <Form @submit="createChannel($event as any)" class="flex:col-lg">
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
