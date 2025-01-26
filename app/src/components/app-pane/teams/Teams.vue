<script lang="ts" setup>
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Field,
  Form,
  NavTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useWorkspace } from "@/domain/workspace";
import { onMounted } from "vue";

const { teams, fetchTeams, createTeam, removeTeam } = useWorkspace();

onMounted(() => fetchTeams());
</script>

<template>
  <div class="flex:col w-96">
    <div class="flex:col-xl p-4">
      <Collapsible as-child>
        <div class="flex:row-auto flex:center-y">
          <h1 class="flex:row-md flex:center-y text-lg">
            <Icon name="bi-person-workspace" />
            <div>Teams</div>
          </h1>

          <CollapsibleTrigger as-child>
            <Button variant="outline" size="badge" class="ml-auto">Create</Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <Form @submit="createTeam($event.name)" class="flex:col-lg">
            <Field label="Name" name="name" placeholder="Create new team..." />
            <Button type="submit" size="xs">Create</Button>
          </Form>
        </CollapsibleContent>
      </Collapsible>
    </div>

    <div class="flex:col">
      <NavTrigger
        v-for="team in teams"
        :key="team.id"
        view="app-pane"
        content="team"
        :props="{ teamId: team.id }"
        class="flex:row flex:center-y p-4 border-t hover:bg-secondary cursor-pointer"
      >
        <div class="flex:col-md">
          <div class="text-base text-foreground font-dmSans font-medium">{{ team.name }}</div>
          <div class="text-xs text-secondary-foreground">4 members</div>
        </div>
        <Icon
          name="io-trash-bin"
          @click.stop="removeTeam(team.id)"
          class="ml-auto cursor-pointer text-foreground"
        />
      </NavTrigger>
    </div>
  </div>
</template>
