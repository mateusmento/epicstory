<script lang="tsx" setup>
import ChannelAttachmentStrip from "@/components/channel/ChannelAttachmentStrip.vue";
import IconClose from "@/components/icons/IconClose.vue";
import { Button, Separator, Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system";
import { IconChannel } from "@/design-system/icons";
import { useDependency } from "@/core/dependency-injection";
import type { UploadedAttachment } from "@/domain/channels/services/channel.service";
import { ChannelApi } from "@/domain/channels/services/channel.service";
import type { User } from "@/domain/auth";
import { type FunctionalComponent as FC, ref, watch } from "vue";
import ChannelMembers from "./ChannelMembers.vue";
import ChannelSchedulesTab from "./ChannelSchedulesTab.vue";

const props = defineProps<{
  members: (User & { role?: string; online?: boolean })[];
  channelId?: number;
}>();

const emit = defineEmits<{
  (e: "add-member", userId: number): void;
  (e: "remove-member", userId: number): void;
  (e: "close"): void;
}>();

const channelApi = useDependency(ChannelApi);
const channelFiles = ref<UploadedAttachment[]>([]);
const channelFilesLoading = ref(false);
const channelFilesError = ref<string | null>(null);

watch(
  () => props.channelId,
  async (id) => {
    if (id == null) {
      channelFiles.value = [];
      return;
    }
    channelFilesLoading.value = true;
    channelFilesError.value = null;
    try {
      channelFiles.value = await channelApi.listChannelAttachments(id);
    } catch {
      channelFiles.value = [];
      channelFilesError.value = "Could not load files";
    } finally {
      channelFilesLoading.value = false;
    }
  },
  { immediate: true },
);

function addMember(userId: number) {
  emit("add-member", userId);
}

function removeMember(userId: number) {
  emit("remove-member", userId);
}
</script>

<script lang="tsx">
const Attribute: FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div class="flex:row-auto flex:center-y py-2">
      <div class="text-xs font-medium text-secondary-foreground">{label}</div>
      <div class="text-xs font-medium text-foreground">{value}</div>
    </div>
  );
};
</script>

<template>
  <!--   -->
  <aside class="flex flex-col h-full w-96 min-h-0 border-l border-zinc-300/60">
    <div class="flex:row-lg flex:center-y px-2 min-h-10 whitespace-nowrap">
      <IconChannel class="overflow-visible" />
      <div class="text-sm">Channel</div>
      <Button variant="ghost" size="icon" class="ml-auto" @click="emit('close')">
        <IconClose class="w-4 h-4" />
      </Button>
    </div>

    <Separator />

    <div class="flex:col p-xl">
      <Attribute label="Created by" value="Mateus Sarmento" />
      <Attribute label="Created at" value="Feb 2, 2024" />
      <Attribute label="Member since" value="Aug 16, 2019" />
    </div>

    <Separator />

    <div class="min-h-0 flex-1 flex flex-col p-0">
      <Tabs default-value="members" class="flex flex-col min-h-0 flex-1">
        <TabsList class="mx-2 mt-1 shrink-0 w-auto justify-start">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
        </TabsList>
        <TabsContent
          value="members"
          class="min-h-0 flex-1 overflow-y-auto p-xl mt-0 data-[state=inactive]:hidden"
        >
          <ChannelMembers :members @add="addMember" @remove="removeMember" />
        </TabsContent>
        <TabsContent
          value="files"
          class="min-h-0 flex-1 overflow-y-auto p-xl mt-0 data-[state=inactive]:hidden"
        >
          <div v-if="channelFilesError" class="text-sm text-red-600">{{ channelFilesError }}</div>
          <p v-else-if="channelFilesLoading" class="text-sm text-muted-foreground">Loading files…</p>
          <p v-else-if="channelFiles.length === 0" class="text-sm text-muted-foreground">
            No files linked in messages yet.
          </p>
          <div v-else class="max-h-[min(70vh,36rem)] overflow-y-auto overscroll-contain pr-1">
            <ChannelAttachmentStrip :files="channelFiles" />
          </div>
        </TabsContent>
        <TabsContent value="schedules" class="min-h-0 flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
          <ChannelSchedulesTab :channel-id="channelId" :members="members" />
        </TabsContent>
      </Tabs>
    </div>
  </aside>
</template>
