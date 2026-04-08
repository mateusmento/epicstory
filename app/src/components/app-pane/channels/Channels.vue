<script setup lang="ts">
import {
  Button,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { SquarePen } from "lucide-vue-next";
import AllTab from "./tabs/AllTab.vue";
import MessagesTab from "./tabs/MessagesTab.vue";

import { SearchBar } from "@/components/searchbar";
import { useDependency } from "@/core/dependency-injection";
import type { Page } from "@/core/types";
import { useChannel, useSyncedChannels } from "@/domain/channels";
import { ChannelApi } from "@/domain/channels/services";
import type { ISearchChannelsAndUsersItem } from "@/domain/channels/types";
import { useWorkspace } from "@/domain/workspace";
import { StorageSerializers, useStorage, watchDebounced } from "@vueuse/core";
import { computed, nextTick, ref, watch } from "vue";
import ChannelSearchResult from "./ChannelSearchResult.vue";

const activeTab = useStorage<string>("channels.activeTab", "all", localStorage, {
  serializer: StorageSerializers.string,
  mergeDefaults: true,
});

const SEARCH_LIMIT = 20;
const normalizeQuery = (value: string) => value.trim() || undefined;
const hasMoreResults = (result: Page<ISearchChannelsAndUsersItem> | null) => !!result?.hasNext;

function appendSearchResults<T>(previous: Page<T> | null, next: Page<T>): Page<T> {
  return previous ? { ...next, content: [...previous.content, ...next.content] } : next;
}

const searchActive = defineModel<boolean>("searchActive", { default: false });

const { openChannel } = useChannel();
const { createChannel } = useSyncedChannels();
const { workspace } = useWorkspace();
const channelApi = useDependency(ChannelApi);

const searchQuery = ref("");
const searchFocused = ref(false);
const searchReady = ref(false);
const searchLoading = ref(false);
const searchResult = ref<Page<ISearchChannelsAndUsersItem> | null>(null);
const searchPage = ref(1);
const searchBar = ref<{ blur: () => void } | null>(null);

const trimmedQuery = computed(() => searchQuery.value.trim());
const inSearchMode = computed(() => searchFocused.value || trimmedQuery.value.length > 0);
const showResults = computed(
  () => inSearchMode.value && (searchLoading.value || searchResult.value !== null),
);

watch(
  inSearchMode,
  (active) => {
    searchActive.value = active;
  },
  { immediate: true },
);

async function fetchSearchPage(page: number) {
  searchLoading.value = true;
  try {
    return await channelApi.searchChannelsAndUsers(workspace.value.id, {
      q: normalizeQuery(searchQuery.value),
      page,
      count: SEARCH_LIMIT,
    });
  } finally {
    searchLoading.value = false;
  }
}

async function replaceSearchResults() {
  const data = await fetchSearchPage(1);
  searchPage.value = data.page;
  searchResult.value = data;
}

async function appendSearchResultsPage() {
  const data = await fetchSearchPage(searchPage.value + 1);
  searchPage.value = data.page;
  searchResult.value = appendSearchResults(searchResult.value, data);
}

watchDebounced(
  searchQuery,
  () => {
    if (searchReady.value) replaceSearchResults();
  },
  { debounce: 300 },
);

function resetSearchState() {
  searchQuery.value = "";
  searchResult.value = null;
  searchReady.value = false;
}

function exitSearchUi() {
  resetSearchState();
  nextTick(() => searchBar.value?.blur());
}

function onSearchFocus() {
  searchReady.value = true;
  searchPage.value = 1;
  replaceSearchResults();
}

function onSearchBlur() {
  if (!trimmedQuery.value) {
    searchResult.value = null;
    searchReady.value = false;
  }
}

function onLoadMore() {
  if (!hasMoreResults(searchResult.value) || searchLoading.value) return;
  appendSearchResultsPage();
}

async function onPickChannel(channelId: number) {
  const channel = await channelApi.findChannel(channelId);
  openChannel(channel);
  // exitSearchUi();
}

async function onPickUser(email: string) {
  const channel = await createChannel({ type: "direct", username: email });
  openChannel(channel);
  // exitSearchUi();
}
</script>

<template>
  <div class="flex:col h-full min-h-0 w-96">
    <div class="flex:row-auto flex:center-y h-10 p-4">
      <div class="flex:row-sm flex:center-y">
        <Icon name="fa-slack-hash" scale="1.2" />
        <div class="text-sm font-medium">Channels</div>
      </div>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon">
            <SquarePen class="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent> Write a new message </TooltipContent>
      </Tooltip>
    </div>

    <Separator class="shrink-0" />

    <div class="flex:col gap-1.5 mx-2 mt-2" :class="inSearchMode ? 'min-h-0 flex-1' : 'shrink-0'">
      <SearchBar
        ref="searchBar"
        v-model="searchQuery"
        v-model:focused="searchFocused"
        :loading="searchLoading"
        placeholder="Search channels & people"
        @focus="onSearchFocus"
        @blur="onSearchBlur"
        @clear="exitSearchUi"
      />

      <ChannelSearchResult
        v-if="showResults"
        :page="
          searchResult ?? {
            content: [],
            page: 1,
            count: SEARCH_LIMIT,
            hasNext: false,
            hasPrevious: false,
            total: 0,
          }
        "
        :loading="searchLoading"
        @reached-bottom="onLoadMore"
        @select-channel="onPickChannel"
        @select-user="onPickUser"
      />
    </div>

    <Tabs v-if="!inSearchMode" v-model="activeTab" as-child>
      <TabsList class="flex:row mt-2 w-auto mx-2">
        <TabsTrigger value="all" class="text-xs">All</TabsTrigger>
        <TabsTrigger value="messages" class="text-xs">Messages</TabsTrigger>
      </TabsList>
      <TabsContent value="all" class="flex-1 min-h-0" as-child>
        <AllTab />
      </TabsContent>
      <TabsContent value="messages" class="flex-1 min-h-0" as-child>
        <MessagesTab />
      </TabsContent>
    </Tabs>
  </div>
</template>
