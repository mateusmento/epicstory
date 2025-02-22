<script setup lang="ts">
import { UserProfile } from "@/components/user";
import {
  Button,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  NavTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useWorkspace } from "@/domain/workspace";
import { NavListItem } from "../layout";
import DropdownMenu from "@/design-system/ui/dropdown-menu/DropdownMenu.vue";
import DropdownMenuItem from "@/design-system/ui/dropdown-menu/DropdownMenuItem.vue";
import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-vue-next";
import { RouterLink } from "vue-router";
import { useAuth } from "@/domain/auth";

defineProps<{ isAppPaneOpen: boolean }>();

const { workspace } = useWorkspace();
const { signOut } = useAuth();
</script>

<template>
  <div class="flex:col-xl h-full">
    <div class="flex:col-md p-2 w-full mr-auto">
      <div class="pl-1 text-xs text-secondary-foreground">Workspace</div>

      <div class="flex:row-md flex:center-y w-full">
        <NavTrigger
          view="navbar"
          content="switch-workspace"
          :as="Button"
          variant="ghost"
          size="sm"
          class="block rounded-md text-base text-foreground font-normal whitespace-nowrap text-ellipsis overflow-hidden"
        >
          {{ workspace?.name }}
          <Icon name="oi-chevron-down" />
        </NavTrigger>

        <div class="flex-1"></div>

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
    </nav>

    <div class="flex-1"></div>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <UserProfile />
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-52">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem :as="RouterLink" to="/settings/user-account">
            <UserIcon class="mr-2 h-4 w-4" />
            <span>Profile</span>
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem>
            <SettingsIcon class="mr-2 h-4 w-4" />
            <span>Settings</span>
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem @click="signOut">
            <LogOutIcon class="mr-2 h-4 w-4" />
            <span>Sign out</span>
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
