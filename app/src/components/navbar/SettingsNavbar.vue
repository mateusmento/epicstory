<script lang="ts" setup>
import { Button, NavTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
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
  </div>
</template>
