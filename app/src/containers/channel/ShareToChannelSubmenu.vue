<script setup lang="ts">
import ChannelSearchResult from "@/presentationals/app-pane/channels/ChannelSearchResult.vue";
import { useDependency } from "@/core/dependency-injection";
import type { IPage } from "@/core/types";
import { MenuInput, MenuItem, MenuSeparator, ScrollArea } from "@/design-system";
import { useChannels } from "@/domain/channels";
import { useShareToChannelStore } from "@/domain/channels/composables/share-to-channel";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { useWorkspace } from "@/domain/workspace";
import { ChannelApi } from "@epicstory/api-client";
import type { IChannel, IIssue, IMessage, ISearchChannelsAndUsersItem } from "@epicstory/contracts";
import { watchDebounced } from "@vueuse/core";
import { HashIcon, Loader2Icon } from "lucide-vue-next";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  mode: "issue" | "comment";
  issue: Pick<IIssue, "id" | "issueKey" | "title" | "status" | "projectId" | "workspaceId"> & Partial<IIssue>;
  comment?: IMessage | null;
  disabled?: boolean;
}>();

const { workspace } = useWorkspace();
const { recentChannels, createChannel } = useChannels();
const channelApi = useDependency(ChannelApi);
const shareStore = useShareToChannelStore();
const { viewContent } = useNavTrigger("details-pane");

const searchQuery = ref("");
const searchLoading = ref(false);
const searchResult = ref<IPage<ISearchChannelsAndUsersItem> | null>(null);
const searchPage = ref(1);
const SEARCH_LIMIT = 20;

const shareableRecent = computed(() => recentChannels.value.filter((c) => c.type !== "workspace_open"));

function filterSearchPage(page: IPage<ISearchChannelsAndUsersItem>): IPage<ISearchChannelsAndUsersItem> {
  return {
    ...page,
    content: page.content.filter((item) => item.kind !== "channel" || item.channel.type !== "workspace_open"),
  };
}

async function fetchSearchPage(page: number) {
  searchLoading.value = true;
  try {
    const data = await channelApi.searchChannelsAndUsers(workspace.value.id, {
      q: searchQuery.value.trim() || undefined,
      page,
      count: SEARCH_LIMIT,
    });
    return filterSearchPage(data);
  } finally {
    searchLoading.value = false;
  }
}

async function replaceSearch() {
  const data = await fetchSearchPage(1);
  searchPage.value = data.page;
  searchResult.value = data;
}

async function appendSearch() {
  if (!searchResult.value?.hasNext) return;
  const data = await fetchSearchPage(searchPage.value + 1);
  searchPage.value = data.page;
  searchResult.value = {
    ...data,
    content: [...(searchResult.value?.content ?? []), ...data.content],
  };
}

watchDebounced(
  searchQuery,
  () => {
    replaceSearch();
  },
  { debounce: 250 },
);

watch(
  () => searchQuery.value,
  (q) => {
    if (!q.trim()) searchResult.value = null;
  },
);

const showSearch = computed(() => searchQuery.value.trim().length > 0);

async function openCompose(channelId: number) {
  if (props.disabled) return;
  if (props.mode === "issue") {
    shareStore.beginIssueShare(channelId, props.issue as IIssue);
  } else if (props.comment) {
    shareStore.beginCommentShare(channelId, props.comment, props.issue);
  }
  viewContent("channel-compose", { channelId });
}

async function onSelectChannel(channelId: number) {
  await openCompose(channelId);
}

async function onSelectUser(userId: number) {
  const channel = await createChannel({
    type: "direct",
    peerId: userId,
  });
  await openCompose(channel.id);
}

function channelLabel(channel: IChannel) {
  return channel.name;
}
</script>

<template>
  <div class="w-72 font-dmSans">
    <MenuInput v-model="searchQuery" placeholder="Search channels or people…" auto-focus />
    <MenuSeparator />

    <template v-if="!showSearch">
      <div v-if="shareableRecent.length === 0" class="px-3 py-6 text-center text-xs text-muted-foreground">
        No recent channels
      </div>
      <ScrollArea v-else class="max-h-72">
        <MenuItem
          v-for="channel in shareableRecent"
          :key="channel.id"
          class="flex items-center gap-2 text-sm"
          @click="onSelectChannel(channel.id)"
        >
          <HashIcon class="size-4 shrink-0 text-muted-foreground" />
          <span class="truncate">{{ channelLabel(channel) }}</span>
        </MenuItem>
      </ScrollArea>
    </template>

    <div v-else class="max-h-72 min-h-[8rem] flex flex-col">
      <ChannelSearchResult
        v-if="searchResult"
        :page="searchResult"
        :loading="searchLoading"
        @reached-bottom="appendSearch"
        @select-channel="onSelectChannel"
        @select-user="onSelectUser"
      />
      <div v-else-if="searchLoading" class="flex justify-center py-6">
        <Loader2Icon class="size-4 animate-spin text-muted-foreground" />
      </div>
    </div>
  </div>
</template>
