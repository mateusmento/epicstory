<script lang="ts" setup>
import { Button, NavTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { NavListItem } from "@/presentationals/layout";
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
      <NavListItem :to="`/${workspace.id}/settings/user-account`" class="flex:row-md flex:center-y">
        <Icon name="fa-user-circle" />
        Profile
      </NavListItem>
      <NavListItem view="app-pane" content="workspace-members" class="flex:row-md flex:center-y">
        <Icon name="bi-people-fill" />
        Members
      </NavListItem>
      <NavListItem :to="`/${workspace.id}/settings/integrations/github`" class="flex:row-md flex:center-y">
        <Icon name="bi-box-arrow-up-right" />
        GitHub
      </NavListItem>
      <NavListItem :to="`/${workspace.id}/settings/integrations/linear`" class="flex:row-md flex:center-y">
        <Icon name="hi-clipboard-list" />
        Linear
      </NavListItem>
    </nav>
  </div>
</template>
