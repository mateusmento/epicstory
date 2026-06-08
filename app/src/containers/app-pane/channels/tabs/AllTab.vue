<script setup lang="ts">
import { UserAvatar } from "@/presentationals/user";
import { Button, Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/design-system";
import { cn } from "@/design-system/utils";
import { useChannel, useChannelGroupsLists, useWorkspaceOnline } from "@/domain/channels";
import {
  useMeeting,
  useMeetingSocket,
  type IncomingMeetingPayload,
  type MeetingEndedPayload,
} from "@/domain/meetings";
import type { IChannel } from "@epicstory/contracts";
import { useWorkspace } from "@/domain/workspace";
import { toPaginatedListView, type PaginatedListView } from "@/lib/async";
import { HashIcon, HeadphonesIcon, PlusIcon } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, reactive, watch } from "vue";
import CreateChannel from "../CreateChannel.vue";
import ChannelContextMenu from "@/presentationals/app-pane/channels/ChannelContextMenu.vue";
import ChannelContextMenuProvider from "../ChannelContextMenuProvider.vue";

const props = defineProps<{
  class?: string;
}>();

const { openChannel } = useChannel();
const { joinMeeting, joinChannelMeeting } = useMeeting();
const { workspace } = useWorkspace();
const meetingSocket = useMeetingSocket();
const { isUserOnline } = useWorkspaceOnline();
const channelGroups = useChannelGroupsLists();

const createDialogOpen = reactive({
  group: false,
  meeting: false,
  direct: false,
});

function onIncomingMeeting({ meeting, channelId }: IncomingMeetingPayload) {
  if (!channelId) return;
  channelGroups.updateChannelMeeting(channelId, meeting);
}

function onMeetingEnded({ channelId }: MeetingEndedPayload) {
  if (!channelId) return;
  channelGroups.updateChannelMeeting(channelId, null);
}

function subscribeMeetingEvents() {
  meetingSocket.emitSubscribeMeetings(workspace.value.id);
  meetingSocket.onIncomingMeeting(onIncomingMeeting);
  meetingSocket.onMeetingEnded(onMeetingEnded);
}

function unsubscribeMeetingEvents() {
  meetingSocket.offIncomingMeeting(onIncomingMeeting);
  meetingSocket.offMeetingEnded(onMeetingEnded);
}

type ChannelSectionItem = {
  title: string;
  createKey: "group" | "meeting" | "direct";
  createTitle: string;
  list: PaginatedListView<IChannel>;
  onLoadMore: () => Promise<void>;
};

const items = computed((): ChannelSectionItem[] => [
  {
    title: "Channels",
    createKey: "group",
    createTitle: "Create channel",
    list: toPaginatedListView(channelGroups.group),
    onLoadMore: () => channelGroups.group.loadMore(workspace.value.id),
  },
  {
    title: "Meetings",
    createKey: "meeting",
    createTitle: "Create meeting channel",
    list: toPaginatedListView(channelGroups.meeting),
    onLoadMore: () => channelGroups.meeting.loadMore(workspace.value.id),
  },
  {
    title: "Direct messages",
    createKey: "direct",
    createTitle: "Start a direct message",
    list: toPaginatedListView(channelGroups.direct),
    onLoadMore: () => channelGroups.direct.loadMore(workspace.value.id),
  },
]);

onMounted(async () => {
  await channelGroups.loadAll(workspace.value.id);
  subscribeMeetingEvents();
});

onUnmounted(() => {
  unsubscribeMeetingEvents();
});

watch(workspace, async () => {
  await channelGroups.loadAll(workspace.value.id);
});

async function onChannelCreated(item: { createKey: "group" | "meeting" | "direct" }) {
  createDialogOpen[item.createKey] = false;
  await channelGroups.loadAll(workspace.value.id);
}
</script>

<template>
  <div :class="cn('flex:col-md m-2 flex-1', props.class)">
    <ChannelContextMenuProvider :refresh="() => channelGroups.loadAll(workspace.id)">
      <template v-for="item in items" :key="item.title">
        <div class="mt-2 ml-2 flex items-center justify-between gap-2">
          <div class="text-xs text-secondary-foreground">{{ item.title }}</div>
          <Dialog v-model:open="createDialogOpen[item.createKey]">
            <DialogTrigger as-child>
              <Button size="icon" variant="ghost" class="h-6 w-6" :title="item.createTitle">
                <PlusIcon class="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>{{ item.createTitle }}</DialogTitle>
              <CreateChannel
                :initialType="item.createKey"
                :showTypeSelector="false"
                @created="onChannelCreated(item)"
              />
            </DialogContent>
          </Dialog>
        </div>

        <ChannelContextMenu v-for="channel of item.list.items" :key="channel.id" :channel="channel">
          <div class="flex:row-sm">
            <div
              class="flex:row-lg flex:center-y flex-1 p-1.5 rounded-lg hover:bg-secondary cursor-pointer"
              @click="openChannel(channel)"
            >
              <UserAvatar
                v-if="channel.directPeer"
                :name="channel.directPeer.name"
                :picture="channel.directPeer.picture"
                size="sm"
                class="shrink-0"
              />
              <HeadphonesIcon
                v-else-if="channel.type === 'meeting'"
                class="h-4 w-4 text-muted-foreground"
                stroke-width="2.5"
              />
              <HashIcon v-else class="h-4 w-4 text-muted-foreground" stroke-width="2.5" />
              <div class="text-xs">{{ channel.name }}</div>
              <div
                v-if="channel.type === 'direct' && channel.directPeer && isUserOnline(channel.directPeer.id)"
                class="w-2 h-2 shrink-0 bg-green-400 rounded-full"
                title="Online"
              ></div>
            </div>
            <button
              v-if="channel.type === 'meeting' || channel.meeting"
              type="button"
              class="p-2 rounded-lg hover:bg-secondary cursor-pointer shrink-0"
              @mousedown.prevent
              @touchstart.prevent
              @click.stop="
                channel.type === 'meeting'
                  ? joinChannelMeeting({ channelId: channel.id })
                  : channel.meeting && joinMeeting({ meetingId: channel.meeting.id })
              "
              title="Join meeting"
            >
              <HeadphonesIcon class="h-4 w-4 text-muted-foreground" stroke-width="2.5" />
            </button>
          </div>
        </ChannelContextMenu>

        <Button
          v-if="item.list.hasMore"
          size="icon"
          variant="ghost"
          class="w-fit ml-2 text-xs text-muted-foreground"
          :disabled="item.list.loadingMore"
          @click="item.onLoadMore"
        >
          Load more
        </Button>
      </template>
    </ChannelContextMenuProvider>
  </div>
</template>
