<script setup lang="ts">
import { UserProfile } from "@/components/user";
import {
  Button,
  MenuContent,
  MenuGroup,
  MenuLabel,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
  Menu,
  MenuItem,
  NavTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { useLiveMeeting, useMeeting } from "@/domain/channels";
import { useNotifications } from "@/domain/notifications";
import { useWorkspace } from "@/domain/workspace";
import {
  ArrowLeft,
  ArrowRight,
  BoxIcon,
  LogOutIcon,
  MonitorCogIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-vue-next";
import { computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useRouter } from "vue-router";
import CurrentMeetingControlsCard from "./CurrentMeetingControlsCard.vue";
import LiveMeetingJoinCard from "./LiveMeetingJoinCard.vue";
import { NavListItem } from "../layout";

defineProps<{ isAppPaneOpen: boolean }>();

const { workspace } = useWorkspace();
const { user, signOut } = useAuth();
const router = useRouter();

const { currentMeeting, incomingMeeting, subscribeMeetings } = useMeeting();

const { liveScheduledMeeting } = useLiveMeeting();

const { unseenCount } = useNotifications();

const showHuddleCard = computed(() => {
  return Boolean(!currentMeeting.value && liveScheduledMeeting.value?.meeting?.ongoing);
});

const huddlePeers = computed(() => {
  return (liveScheduledMeeting.value?.participantsPreview ?? []).slice(0, 4);
});

onMounted(() => {
  subscribeMeetings();
});

async function onJoinLiveScheduledMeeting() {
  if (!liveScheduledMeeting.value?.meeting) return;
  const calendarEventId = liveScheduledMeeting.value?.meeting.calendarEventId;
  const occurrenceAt = liveScheduledMeeting.value?.meeting.occurrenceAt;
  // if (!calendarEventId || !occurrenceAt) return;
  router.push({
    name: "meeting-lobby",
    params: { workspaceId: workspace.value.id },
    query: { occurrenceAt, calendarEventId, meetingId: liveScheduledMeeting.value?.meeting.id },
  });
}
</script>

<template>
  <div class="flex:col-xl h-full">
    <div class="flex:col-xl w-full p-2 mr-auto">
      <div class="flex:row-auto flex:center-y">
        <div class="text-xs text-secondary-foreground">Workspace</div>
        <div class="flex:row-md flex:center-y h-fit">
          <Button variant="outline" size="icon" class="bg-white">
            <ArrowLeft class="w-4 h-4 text-secondary-foreground" />
          </Button>
          <Button variant="outline" size="icon" class="bg-white">
            <ArrowRight class="w-4 h-4 text-secondary-foreground" />
          </Button>
        </div>
      </div>

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

    <nav class="flex:col-md">
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
        Issues
      </NavListItem>
      <NavListItem view="app-pane" content="channels" class="flex:row-md flex:center-y">
        <Icon name="fa-slack-hash" />
        Channels
        <Icon name="bi-chevron-expand" class="ml-auto" />
      </NavListItem>
      <NavListItem view="app-pane" content="projects" class="flex:row-md flex:center-y">
        <MonitorCogIcon class="size-4" stroke-width="2.5" />
        Projects
      </NavListItem>
      <NavListItem view="app-pane" content="teams" class="flex:row-md flex:center-y">
        <Icon name="bi-person-workspace" />
        Teams
      </NavListItem>
      <NavListItem view="app-pane" content="workspace-members" class="flex:row-md flex:center-y">
        <Icon name="bi-people-fill" />
        Members
      </NavListItem>
      <NavListItem
        view="app-pane"
        content="schedule"
        :to="{ name: 'schedule', params: { workspaceId: workspace.id } }"
        class="flex:row-md flex:center-y"
      >
        <Icon name="oi-calendar" />
        Schedule
      </NavListItem>
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

          <MenuItem @click="signOut" variant="destructive" class="text-[13px] w-44">
            <LogOutIcon class="mr-2 h-4 w-4" />
            <span>Sign out</span>
            <MenuShortcut>⇧⌘Q</MenuShortcut>
          </MenuItem>
        </MenuGroup>
      </MenuContent>
    </Menu>
  </div>
</template>
