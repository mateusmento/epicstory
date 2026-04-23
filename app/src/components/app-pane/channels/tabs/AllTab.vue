<script setup lang="ts">
import { UserAvatar } from "@/components/user";
import { Button, Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/design-system";
import { cn } from "@/design-system/utils";
import { useDependency } from "@/core/dependency-injection";
import type { Page } from "@/core/types";
import {
  useChannel,
  useMeeting,
  useMeetingSocket,
  useWorkspaceOnline,
  type IncomingMeetingPayload,
  type MeetingEndedPayload,
} from "@/domain/channels";
import { ChannelApi } from "@/domain/channels/services";
import type { IChannel } from "@/domain/channels/types";
import { useWorkspace } from "@/domain/workspace";
import { HashIcon, HeadphonesIcon, PlusIcon } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import CreateChannel from "../CreateChannel.vue";
import ChannelContextMenu from "../ChannelContextMenu.vue";
import ChannelContextMenuProvider from "../ChannelContextMenuProvider.vue";

const props = defineProps<{
  class?: string;
}>();

const { openChannel } = useChannel();
const { joinMeeting, joinChannelMeeting } = useMeeting();
const { workspace } = useWorkspace();
const channelApi = useDependency(ChannelApi);
const meetingSocket = useMeetingSocket();
const { isUserOnline } = useWorkspaceOnline();

type ChannelPage = Page<IChannel>;

const groupChannels = ref<ChannelPage | null>(null);
const meetingChannels = ref<ChannelPage | null>(null);
const directChannels = ref<ChannelPage | null>(null);

const loadingGroup = ref(false);
const loadingMeeting = ref(false);
const loadingDirect = ref(false);

const GROUP_COUNT = 20;
const createDialogOpen = reactive({
  group: false,
  meeting: false,
  direct: false,
});

function mergePages<T>(previous: Page<T> | null, next: Page<T>): Page<T> {
  return previous ? { ...next, content: [...previous.content, ...next.content] } : next;
}

async function fetchInitial() {
  const result = await channelApi.findChannelGroups(workspace.value.id, {
    groupPage: 1,
    meetingPage: 1,
    directPage: 1,
    count: GROUP_COUNT,
  });
  groupChannels.value = result.groupChannels;
  meetingChannels.value = result.meetingChannels;
  directChannels.value = result.directChannels;
}

async function loadMoreGroup() {
  if (!groupChannels.value?.hasNext || loadingGroup.value) return;
  loadingGroup.value = true;
  try {
    const nextPage = groupChannels.value.page + 1;
    const result = await channelApi.findChannelGroups(workspace.value.id, {
      groupPage: nextPage,
      count: GROUP_COUNT,
    });
    groupChannels.value = mergePages(groupChannels.value, result.groupChannels);
  } finally {
    loadingGroup.value = false;
  }
}

async function loadMoreMeetings() {
  if (!meetingChannels.value?.hasNext || loadingMeeting.value) return;
  loadingMeeting.value = true;
  try {
    const nextPage = meetingChannels.value.page + 1;
    const result = await channelApi.findChannelGroups(workspace.value.id, {
      meetingPage: nextPage,
      count: GROUP_COUNT,
    });
    meetingChannels.value = mergePages(meetingChannels.value, result.meetingChannels);
  } finally {
    loadingMeeting.value = false;
  }
}

async function loadMoreDirect() {
  if (!directChannels.value?.hasNext || loadingDirect.value) return;
  loadingDirect.value = true;
  try {
    const nextPage = directChannels.value.page + 1;
    const result = await channelApi.findChannelGroups(workspace.value.id, {
      directPage: nextPage,
      count: GROUP_COUNT,
    });
    directChannels.value = mergePages(directChannels.value, result.directChannels);
  } finally {
    loadingDirect.value = false;
  }
}

function updateChannelMeeting(channelId: number, meeting: any | null) {
  const find = (page: ChannelPage | null) => page?.content.find((c) => c.id === channelId);
  const channel = find(groupChannels.value) ?? find(meetingChannels.value) ?? find(directChannels.value);
  if (channel) channel.meeting = meeting;
}

function onIncomingMeeting({ meeting, channelId }: IncomingMeetingPayload) {
  if (!channelId) return;
  updateChannelMeeting(channelId, meeting);
}

function onMeetingEnded({ channelId }: MeetingEndedPayload) {
  if (!channelId) return;
  updateChannelMeeting(channelId, null);
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

const items = computed(() => [
  {
    title: "Channels",
    createKey: "group" as const,
    createTitle: "Create channel",
    page: groupChannels.value,
    onLoadMore: loadMoreGroup,
    loading: loadingGroup.value,
  },
  {
    title: "Meetings",
    createKey: "meeting" as const,
    createTitle: "Create meeting channel",
    page: meetingChannels.value,
    onLoadMore: loadMoreMeetings,
    loading: loadingMeeting.value,
  },
  {
    title: "Direct messages",
    createKey: "direct" as const,
    createTitle: "Start a direct message",
    page: directChannels.value,
    onLoadMore: loadMoreDirect,
    loading: loadingDirect.value,
  },
]);

onMounted(async () => {
  await fetchInitial();
  subscribeMeetingEvents();
});

onUnmounted(() => {
  unsubscribeMeetingEvents();
});

watch(workspace, async () => {
  await fetchInitial();
});

async function onChannelCreated(item: { createKey: "group" | "meeting" | "direct" }) {
  createDialogOpen[item.createKey] = false;
  await fetchInitial();
}
</script>

<template>
  <div :class="cn('flex:col-md m-2 flex-1', props.class)">
    <ChannelContextMenuProvider :refresh="fetchInitial">
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

        <ChannelContextMenu v-for="channel of item.page?.content ?? []" :key="channel.id" :channel="channel">
          <div class="flex:row-sm">
            <div
              class="flex:row-lg flex:center-y flex-1 p-1.5 rounded-lg hover:bg-secondary cursor-pointer"
              @click="openChannel(channel)"
            >
              <UserAvatar
                v-if="channel.speakingTo"
                :name="channel.speakingTo.name"
                :picture="channel.speakingTo.picture"
                size="sm"
                class="shrink-0"
              />
              <HeadphonesIcon
                v-else-if="channel.type === 'meeting'"
                class="h-4 w-4 text-muted-foreground"
                stroke-width="2.5"
              />
              <HashIcon v-else class="h-4 w-4 text-muted-foreground" stroke-width="2.5" />
              <div class="text-xs">{{ channel.name || channel.speakingTo.name }}</div>
              <div
                v-if="channel.type === 'direct' && channel.speakingTo && isUserOnline(channel.speakingTo.id)"
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
          v-if="item.page?.hasNext"
          size="icon"
          variant="ghost"
          class="w-fit ml-2 text-xs text-muted-foreground"
          :disabled="item.loading"
          @click="item.onLoadMore"
        >
          Load more
        </Button>
      </template>
    </ChannelContextMenuProvider>
  </div>
</template>
