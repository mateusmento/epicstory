<script setup lang="ts">
import { useDependency } from "@/core/dependency-injection";
import { useChannel, useSyncedChannels } from "@/domain/channels";
import { ChannelApi } from "@/domain/channels/services";
import type { ISearchChannelsAndUsersResponse } from "@/domain/channels/types";
import { useWorkspace } from "@/domain/workspace";
import { watchDebounced } from "@vueuse/core";
import { computed, nextTick, ref, watch } from "vue";
import { SearchBar } from "@/components/searchbar";
import ChannelSearchResult from "./ChannelSearchResult.vue";

const SEARCH_LIMIT = 20;
const normalizeQuery = (value: string) => value.trim() || undefined;
const hasMoreResults = (result: ISearchChannelsAndUsersResponse | null) =>
  !!result && result.items.length < result.total;

const appendSearchResults = <T extends { items: any[] }>(previous: T | null, next: T) =>
  previous ? { ...next, items: [...previous.items, ...next.items] } : next;

const searchActive = defineModel<boolean>("searchActive", { default: false });

const { openChannel } = useChannel();
const { channels, createChannel } = useSyncedChannels();
const { workspace } = useWorkspace();
const channelApi = useDependency(ChannelApi);

const searchQuery = ref("");
const searchFocused = ref(false);
const searchReady = ref(false);
const searchLoading = ref(false);
const searchResult = ref<ISearchChannelsAndUsersResponse | null>(null);
const searchPage = ref(1);
const searchBar = ref<{ blur: () => void } | null>(null);

const trimmedQuery = computed(() => searchQuery.value.trim());
const inSearchMode = computed(() => searchFocused.value || trimmedQuery.value.length > 0);
const resultItems = computed(() => searchResult.value?.items ?? []);
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
      limit: SEARCH_LIMIT,
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

async function resolveChannel(channelId: number) {
  return channels.value.find((channel) => channel.id === channelId) ?? channelApi.findChannel(channelId);
}

async function onPickChannel(channelId: number) {
  const channel = await resolveChannel(channelId);
  openChannel(channel);
  //   exitSearchUi();
}

async function onPickUser(email: string) {
  const channel = await createChannel({ type: "direct", username: email });
  console.log("openChannel", channel);
  openChannel(channel);
  //   exitSearchUi();
}
</script>

<template>
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
      :items="resultItems"
      :loading="searchLoading"
      @reached-bottom="onLoadMore"
      @select-channel="onPickChannel"
      @select-user="onPickUser"
    />
  </div>
</template>
