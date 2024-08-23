<script lang="ts" setup>
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Field, Form } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useWorkspace } from "@/domain/workspace";
import { onMounted } from "vue";

const { teams, fetchTeams, createTeam } = useWorkspace();

onMounted(() => fetchTeams());
</script>

<template>
  <div class="flex:rows">
    <div class="flex:rows-xl p-4">
      <Collapsible as-child>
        <div class="flex:cols-auto flex:center-y">
          <h1 class="flex:cols-md flex:center-y text-lg">
            <Icon name="hi-clipboard-list" />
            <div>Teams</div>
          </h1>

          <CollapsibleTrigger as-child>
            <Button variant="outline" size="badge" class="ml-auto">Create</Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <Form @submit="createTeam($event.name)" class="flex:rows-lg">
            <Field label="Name" name="name" placeholder="Create new team..." />
            <Button type="submit" size="xs">Create</Button>
          </Form>
        </CollapsibleContent>
      </Collapsible>
    </div>

    <div class="flex:rows">
      <div
        v-for="team in teams"
        :key="team.id"
        class="flex:rows-md p-4 border-t hover:bg-zinc-200/60 cursor-pointer"
      >
        <div class="text-base text-zinc-800 font-dmSans font-medium">{{ team.name }}</div>
        <div class="text-xs text-zinc-500">4 members</div>
      </div>
    </div>
  </div>
</template>
