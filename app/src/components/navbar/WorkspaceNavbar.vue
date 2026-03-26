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
import { useWorkspace } from "@/domain/workspace";
import { ArrowLeft, ArrowRight, LogOutIcon, SettingsIcon, UserIcon } from "lucide-vue-next";
import { RouterLink } from "vue-router";
import { NavListItem } from "../layout";

defineProps<{ isAppPaneOpen: boolean }>();

const { workspace } = useWorkspace();
const { user, signOut } = useAuth();
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

    <nav class="flex:col-md">
      <NavListItem view="app-pane" content="inbox" class="flex:row-md flex:center-y">
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
        <Icon name="hi-clipboard-list" />
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
