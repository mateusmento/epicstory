import { useDependency } from "@/core/dependency-injection";
import { createPaginatedListEngine, createPaginatedListState, type PaginatedListState } from "@/domain/async";
import { ChannelApi } from "@epicstory/api-client";
import type { ChannelGroupsPage, IChannel, IMeetingAttendee, IPage } from "@epicstory/contracts";
import { toReactive } from "@vueuse/core";
import { markRaw, toRefs } from "vue";

const GROUP_COUNT = 20;

type ChannelGroupKind = "group" | "meeting" | "direct";

const PAGE_PARAM: Record<ChannelGroupKind, "groupPage" | "meetingPage" | "directPage"> = {
  group: "groupPage",
  meeting: "meetingPage",
  direct: "directPage",
};

const SECTION_KEY: Record<ChannelGroupKind, keyof ChannelGroupsPage> = {
  group: "groupChannels",
  meeting: "meetingChannels",
  direct: "directChannels",
};

/** Maps API page (1-based) into engine page index (0-based). */
function seedChannelListState(state: PaginatedListState<IChannel>, page: IPage<IChannel>): void {
  state.items = page.content;
  state.hasMore = page.hasNext;
  state.page = page.page - 1;
  state.error = null;
}

function createChannelGroupListEngine(
  channelApi: ChannelApi,
  kind: ChannelGroupKind,
  state: PaginatedListState<IChannel>,
) {
  const pageParam = PAGE_PARAM[kind];
  const sectionKey = SECTION_KEY[kind];

  return createPaginatedListEngine({
    state,
    searchDebounceMs: 200,
    isContextReady: (workspaceId: number) => !!workspaceId,
    getItemId: (channel) => channel.id,
    fetchPage: (workspaceId, _query, page, pageSize) =>
      channelApi
        .findChannelGroups(workspaceId, {
          [pageParam]: page + 1,
          count: pageSize,
        })
        .then((result) => result[sectionKey]),
  });
}

function sectionBundle(
  state: PaginatedListState<IChannel>,
  loadMore: (workspaceId: number) => Promise<void>,
) {
  return toReactive({
    ...toRefs(state),
    loadMore: markRaw(loadMore),
  });
}

/**
 * Three independent channel group lists (group / meeting / direct) backed by
 * {@link createPaginatedListEngine}. Initial load uses one batched API call;
 * "load more" per section uses the engine.
 */
export function useChannelGroupsLists() {
  const channelApi = useDependency(ChannelApi);

  const groupState = createPaginatedListState<IChannel>({
    pageSize: GROUP_COUNT,
    hasMore: false,
  });
  const meetingState = createPaginatedListState<IChannel>({
    pageSize: GROUP_COUNT,
    hasMore: false,
  });
  const directState = createPaginatedListState<IChannel>({
    pageSize: GROUP_COUNT,
    hasMore: false,
  });

  const groupEngine = createChannelGroupListEngine(channelApi, "group", groupState);
  const meetingEngine = createChannelGroupListEngine(channelApi, "meeting", meetingState);
  const directEngine = createChannelGroupListEngine(channelApi, "direct", directState);

  async function loadAll(workspaceId: number): Promise<void> {
    if (!workspaceId) return;

    groupState.loading = true;
    meetingState.loading = true;
    directState.loading = true;
    groupState.error = null;
    meetingState.error = null;
    directState.error = null;

    try {
      const result = await channelApi.findChannelGroups(workspaceId, {
        groupPage: 1,
        meetingPage: 1,
        directPage: 1,
        count: GROUP_COUNT,
      });
      seedChannelListState(groupState, result.groupChannels);
      seedChannelListState(meetingState, result.meetingChannels);
      seedChannelListState(directState, result.directChannels);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load channels.";
      groupState.error = message;
      meetingState.error = message;
      directState.error = message;
    } finally {
      groupState.loading = false;
      meetingState.loading = false;
      directState.loading = false;
    }
  }

  function updateChannelMeeting(channelId: number, meeting: IChannel["meeting"] | null): void {
    for (const state of [groupState, meetingState, directState]) {
      const channel = state.items.find((c) => c.id === channelId);
      if (channel) {
        channel.meeting = meeting;
        return;
      }
    }
  }

  function updateChannelMeetingAttendees(
    channelId: number,
    updater: (prev: IMeetingAttendee[]) => IMeetingAttendee[],
  ): void {
    for (const state of [groupState, meetingState, directState]) {
      const channel = state.items.find((c) => c.id === channelId);
      if (channel?.meeting) {
        channel.meeting.attendees = updater(channel.meeting.attendees ?? []);
        return;
      }
    }
  }

  return toReactive({
    group: sectionBundle(groupState, groupEngine.loadMore),
    meeting: sectionBundle(meetingState, meetingEngine.loadMore),
    direct: sectionBundle(directState, directEngine.loadMore),
    loadAll: markRaw(loadAll),
    updateChannelMeeting: markRaw(updateChannelMeeting),
    updateChannelMeetingAttendees: markRaw(updateChannelMeetingAttendees),
  });
}
