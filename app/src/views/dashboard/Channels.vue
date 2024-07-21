<script setup lang="ts">
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system";
import {
  IconArrowDown,
  IconChannel,
  IconContacts,
  IconHashtag,
  IconInbox,
  IconMention,
  IconSearch,
  IconThreads,
} from "@/design-system/icons";
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
      <div class="flex:cols-2xl flex:center-y p-4 border-t hover:bg-neutral-200/60 cursor-pointer">
        <img src="@/assets/images/leon.png" class="w-10 h-10" />
        <div class="self:fill flex:rows-md">
          <div class="flex:cols-auto flex:center-y">
            <div class="text-base font-semibold text-zinc-800">Leon</div>
            <div class="text-xs text-zinc-500">14min ago</div>
          </div>
          <div class="text-sm text-zinc-500">Leon is typing something...</div>
        </div>
      </div>
      <div class="flex:cols-2xl flex:center-y p-4 border-t hover:bg-neutral-200/60 cursor-pointer">
        <IconHashtag class="w-10 h-10" />
        <div class="self:fill flex:rows-md">
          <div class="flex:cols-auto flex:center-y">
            <div class="text-base font-semibold text-zinc-800">#tech-help</div>
            <div class="text-xs text-zinc-500">3h ago</div>
          </div>
          <div class="flex:cols-auto flex:center-y">
            <div class="text-sm text-zinc-800">It seems to be a bug in latest version...</div>
            <div class="w-fit px-1 py-0 rounded-sm bg-zinc-200 text-xs text-zinc-500">2</div>
          </div>
        </div>
      </div>
      <div class="flex:cols-2xl flex:center-y p-4 border-t hover:bg-neutral-200/60 cursor-pointer">
        <img src="@/assets/images/daiana.png" class="w-10 h-10" />
        <div class="self:fill flex:rows-md">
          <div class="flex:cols-auto flex:center-y">
            <div class="text-base font-semibold text-zinc-800">Daiana</div>
            <div class="text-xs text-zinc-500">3h ago</div>
          </div>
          <div class="flex:cols-auto flex:center-y">
            <div class="text-sm text-zinc-800">Hey, Mateus! The proposal is great and...</div>
            <div class="w-fit px-1 py-0 rounded-sm bg-zinc-200 text-xs text-zinc-500">1</div>
          </div>
        </div>
      </div>
      <div class="w-fit mt-4 mx-auto text-xs text-zinc-500">You have no more messages</div>
      <Button
        legacy
        legacy-variant="primary"
        legacy-size="sm"
        class="flex:cols-md flex:center-y m-8 mt-auto ml-auto text-sm"
      >
        <IconChannel />
        Create Channel
      </Button>
    </TabsContent>
    <TabsContent value="mentions"></TabsContent>
    <TabsContent value="threads"></TabsContent>
  </Tabs>
</template>
