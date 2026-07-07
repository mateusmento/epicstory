<script setup lang="ts">
import { UserProfile } from "@/containers/user";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
  NavTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { useSyncedChannels } from "@/domain/channels";
import { isLiveJoinableMeeting, useLiveMeeting, useMeeting } from "@/domain/meetings";
import { useNotifications } from "@/domain/notifications";
import { useTeams } from "@/domain/team";
import { useRecentProjects, useWorkspace } from "@/domain/workspace";
import { NavListItem } from "@/presentationals/layout";
import LiveMeetingJoinCard from "@/presentationals/navbar/LiveMeetingJoinCard.vue";
import { ThemePicker } from "@/presentationals/theme";
import { UserAvatar } from "@/presentationals/user";
import type { Project } from "@epicstory/contracts";
import {
  ListIcon,
  LogOutIcon,
  MonitorCogIcon,
  SettingsIcon,
  SquareChartGanttIcon,
  UserIcon,
  UsersIcon,
} from "lucide-vue-next";
import { computed, onMounted, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import CurrentMeetingControlsCard from "./CurrentMeetingControlsCard.vue";

defineProps<{ isAppPaneOpen: boolean }>();

const { workspace } = useWorkspace();
const { recentChannels } = useSyncedChannels();
const { recentProjects, fetchRecentProjects } = useRecentProjects();
const { teams, fetchTeams } = useTeams();
const { user, signOut } = useAuth();
const router = useRouter();

const { currentMeeting, incomingMeeting, subscribeMeetings } = useMeeting();
const { liveScheduledMeeting } = useLiveMeeting();
const { unseenCount } = useNotifications();

const showHuddleCard = computed(() => {
  const meeting = liveScheduledMeeting.value?.meeting;
  return Boolean(!currentMeeting.value && meeting && isLiveJoinableMeeting(meeting));
});

const huddlePeers = computed(() => {
  return (liveScheduledMeeting.value?.participantsPreview ?? []).slice(0, 4);
});

const projectsByTeamId = computed(() => {
  const map = new Map<number, Project[]>();
  for (const project of recentProjects.value) {
    const list = map.get(project.teamId) ?? [];
    list.push(project);
    map.set(project.teamId, list);
  }
  return map;
});

const teamsWithRecentProjects = computed(() =>
  teams.value.map((team) => ({
    team,
    projects: projectsByTeamId.value.get(team.id) ?? [],
  })),
);

const hasWorkNestedItems = computed(() => teams.value.length > 0 || recentProjects.value.length > 0);

onMounted(() => {
  subscribeMeetings();
});

async function onJoinLiveScheduledMeeting() {
  const meeting = liveScheduledMeeting.value?.meeting;
  if (!meeting || !isLiveJoinableMeeting(meeting)) return;
  const calendarEventId = liveScheduledMeeting.value?.meeting.calendarEventId;
  const scheduledStartsAt = meeting.scheduledStartsAt;
  const occurrenceAt = scheduledStartsAt != null ? new Date(scheduledStartsAt).toISOString() : undefined;
  router.push({
    name: "meeting-lobby",
    params: { workspaceId: String(workspace.value.id) },
    query: {
      ...(occurrenceAt != null ? { occurrenceAt } : {}),
      ...(calendarEventId != null ? { calendarEventId: String(calendarEventId) } : {}),
      meetingId: String(liveScheduledMeeting.value?.meeting.id),
    },
  });
}

onMounted(async () => {
  if (workspace.value?.id) {
    fetchRecentProjects(workspace.value.id);
    fetchTeams(workspace.value.id);
  }
});

watch(workspace, () => {
  if (workspace.value?.id) {
    fetchRecentProjects(workspace.value.id);
    fetchTeams(workspace.value.id);
  }
});
</script>

<template>
  <div class="flex:col-xl h-full">
    <div class="flex:col-xl w-full p-2 mr-auto">
      <div class="text-xs text-secondary-foreground px-1 mb-1">Workspace</div>

      <div class="flex:row-auto flex:center-y">
        <NavTrigger
          view="navbar"
          content="switch-workspace"
          :as="Button"
          variant="ghost"
          size="sm"
          class="block w-fit -ml-2 rounded-md text-base text-foreground font-normal whitespace-nowrap text-ellipsis overflow-hidden"
        >
          {{ workspace.name }}
          <Icon name="oi-chevron-down" />
        </NavTrigger>
        <NavTrigger view="navbar" content="settings" :as="Button" variant="ghost" size="icon">
          <Icon name="md-settings-round" />
        </NavTrigger>
      </div>
    </div>

    <div v-if="showHuddleCard" class="px-2">
      <LiveMeetingJoinCard
        :title="liveScheduledMeeting?.calendarEvent?.title ?? 'Meeting'"
        :people="huddlePeers"
        @join="onJoinLiveScheduledMeeting"
      />
    </div>

    <nav class="flex:col-md px-1">
      <!-- My work -->
      <div class="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">My work</div>
      <NavListItem
        view="app-pane"
        content="inbox"
        class="flex:row-md flex:center-y"
        :badge-count="unseenCount"
      >
        <Icon name="oi-inbox" />
        Inbox
      </NavListItem>
      <NavListItem view="app-pane" content="issues" class="flex:row-md flex:center-y">
        <Icon name="oi-apps" />
        My issues
      </NavListItem>
      <NavListItem
        :to="{ name: 'schedule', params: { workspaceId: workspace.id } }"
        class="flex:row-md flex:center-y"
      >
        <Icon name="oi-calendar" />
        Schedule
      </NavListItem>

      <!-- Work: teams & projects -->
      <div class="px-2 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Work</div>
      <Collapsible as-child v-slot="{ open }" default-open>
        <div class="flex:row-sm flex:center-y w-full justify-start">
          <NavListItem
            view="app-pane"
            content="projects"
            class="flex:row-md flex:center-y w-full justify-start"
          >
            <MonitorCogIcon class="size-4 shrink-0" stroke-width="2.5" />
            Teams &amp; projects
          </NavListItem>
          <CollapsibleTrigger v-if="hasWorkNestedItems" as-child>
            <Button variant="ghost" size="sm" class="w-fit flex:row-md flex:center-y text-muted-foreground">
              <Icon v-if="open" name="oi-chevron-up" />
              <Icon v-else name="oi-chevron-down" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div class="ml-3 pl-2 border-l border-border flex:col gap-0.5">
            <template v-for="{ team, projects } in teamsWithRecentProjects" :key="team.id">
              <NavListItem :to="`/${workspace.id}/team/${team.id}`" class="flex:row-md flex:center-y">
                <UsersIcon class="size-4 shrink-0" stroke-width="2.5" />
                <span class="truncate">{{ team.name }}</span>
              </NavListItem>
              <NavListItem
                :to="`/${workspace.id}/team/${team.id}/timeline`"
                class="flex:row-md flex:center-y ml-3"
              >
                <SquareChartGanttIcon class="size-3.5 shrink-0 text-muted-foreground" stroke-width="2.5" />
                <span class="truncate text-sm">Timeline</span>
              </NavListItem>
              <NavListItem
                v-for="project in projects"
                :key="project.id"
                :to="`/${workspace.id}/project/${project.id}/backlog`"
                class="flex:row-md flex:center-y ml-3"
              >
                <MonitorCogIcon class="size-3.5 shrink-0 text-muted-foreground" stroke-width="2.5" />
                <span class="truncate text-sm">{{ project.name }}</span>
              </NavListItem>
            </template>

            <NavListItem view="app-pane" content="projects" class="flex:row-md flex:center-y mt-1">
              <ListIcon class="size-4 shrink-0 text-muted-foreground" />
              <span class="text-sm text-muted-foreground">All projects</span>
            </NavListItem>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <!-- Communication -->
      <div class="px-2 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Communication
      </div>
      <Collapsible as-child v-slot="{ open }" default-open>
        <div class="flex:row-sm flex:center-y w-full justify-start">
          <NavListItem
            view="app-pane"
            content="channels"
            class="flex:row-md flex:center-y w-full justify-start"
          >
            <Icon name="fa-slack-hash" />
            Channels
          </NavListItem>
          <CollapsibleTrigger v-if="recentChannels.length > 0" as-child>
            <Button variant="ghost" size="sm" class="w-fit flex:row-md flex:center-y text-muted-foreground">
              <Icon v-if="open" name="oi-chevron-up" />
              <Icon v-else name="oi-chevron-down" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div class="ml-3 pl-2 border-l border-border">
            <NavListItem
              v-for="channel of recentChannels"
              :key="channel.id"
              :to="`/${workspace.id}/channel/${channel.id}`"
              :badge-count="channel.unreadMessagesCount"
              class="flex:row-md flex:center-y"
            >
              <UserAvatar
                v-if="channel.directPeer"
                :name="channel.directPeer.name"
                :picture="channel.directPeer.picture"
                size="xs"
                class="shrink-0"
              />
              <Icon v-else name="fa-slack-hash" class="shrink-0" />
              <span class="truncate">{{ channel.directPeer?.name ?? channel.name }}</span>
            </NavListItem>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </nav>

    <div class="flex-1"></div>

    <div v-if="currentMeeting || incomingMeeting" class="px-2 pb-2">
      <CurrentMeetingControlsCard />
    </div>

    <Menu type="dropdown-menu">
      <MenuTrigger as-child>
        <UserProfile />
      </MenuTrigger>
      <MenuContent>
        <MenuLabel class="flex:col-sm flex-1 min-w-0 max-w-44">
          <div class="font-medium whitespace-nowrap text-ellipsis overflow-hidden">
            {{ user?.name }}
          </div>
          <div
            class="text-xs text-secondary-foreground font-normal whitespace-nowrap text-ellipsis overflow-hidden"
          >
            {{ user?.email }}
          </div>
        </MenuLabel>

        <MenuSeparator />

        <MenuGroup>
          <MenuItem :as="RouterLink" :to="`/${workspace.id}/settings/user-account`" class="text-[13px] w-44">
            <UserIcon class="mr-2 h-4 w-4" />
            <span>Profile</span>
            <MenuShortcut>⇧⌘P</MenuShortcut>
          </MenuItem>

          <MenuItem class="text-[13px] w-44">
            <SettingsIcon class="mr-2 h-4 w-4" />
            <span>Settings</span>
            <MenuShortcut>⌘S</MenuShortcut>
          </MenuItem>

          <MenuSeparator />

          <MenuLabel class="text-xs text-muted-foreground px-2 py-1.5">Appearance</MenuLabel>
          <ThemePicker variant="menu" />

          <MenuSeparator />

          <MenuItem @click="signOut" intent="destructive" class="text-[13px] w-44">
            <LogOutIcon class="mr-2 h-4 w-4" />
            <span>Sign out</span>
            <MenuShortcut>⇧⌘Q</MenuShortcut>
          </MenuItem>
        </MenuGroup>
      </MenuContent>
    </Menu>
  </div>
</template>
