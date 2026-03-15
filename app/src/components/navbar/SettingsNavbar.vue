<script lang="ts" setup>
import { Button, NavTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { NavListItem } from "../layout";
import { useWorkspace } from "@/domain/workspace";

const { workspace } = useWorkspace();
</script>

<template>
  <div>
    <div class="p-2 pb-0">
      <NavTrigger
        view="navbar"
        content="workspace"
        :as="Button"
        variant="ghost"
        size="xs"
        class="flex:row-sm ml-auto text-xs text-secondary-foreground"
      >
        <Icon name="hi-solid-arrow-sm-left" />
        Back to workspace
      </NavTrigger>
    </div>

    <nav class="flex:col-md p-2">
      <NavListItem
        view="app-pane"
        content="settings-profile"
        :to="`/${workspace.id}/settings/user-account`"
        class="flex:row-md flex:center-y"
      >
        <Icon name="fa-user-circle" />
        Profile
      </NavListItem>
      <NavListItem
        view="app-pane"
        content="settings-integrations-linear"
        :to="`/${workspace.id}/settings/integrations/linear`"
        class="flex:row-md flex:center-y"
      >
        <Icon name="hi-clipboard-list" />
        Integrations
      </NavListItem>
    </nav>
  </div>
</template>
