<script lang="ts" setup>
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Field,
  Form,
  NavTrigger,
  Separator,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useWorkspace } from "@/domain/workspace";
import { Trash2Icon } from "lucide-vue-next";
import { onMounted, watch } from "vue";

const { workspace, teams, fetchTeams, createTeam, removeTeam } = useWorkspace();

onMounted(() => fetchTeams());
watch(workspace, fetchTeams);
</script>

<template>
  <div class="flex:col w-96">
    <Collapsible as-child>
      <div class="flex:row-auto flex:center-y px-4 py-2 h-14">
        <h1 class="flex:row-md flex:center-y font-semibold">
          <Icon name="bi-person-workspace" />
          <div>Teams</div>
        </h1>

        <CollapsibleTrigger as-child>
          <Button variant="outline" size="badge" class="ml-auto">Create</Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <Form @submit="createTeam($event.name)" class="flex:col-lg m-2 p-2 border rounded-lg">
          <Field label="Name" name="name" placeholder="Create new team..." />
          <Button type="submit" size="xs">Create</Button>
        </Form>
      </CollapsibleContent>
    </Collapsible>

    <Separator />

    <div class="flex:col p-2">
      <NavTrigger
        v-for="team in teams"
        :key="team.id"
        view="app-pane"
        content="team"
        :props="{ teamId: team.id }"
        class="flex:row-2xl flex:center-y py-2 px-4 rounded-lg hover:bg-secondary cursor-pointer"
      >
        <div class="flex:row-auto flex:center-y flex-1">
          <div class="text-base text-foreground font-dmSans font-medium">{{ team.name }}</div>
          <div class="text-xs text-secondary-foreground">4 members</div>
        </div>
        <Trash2Icon
          @click.stop="removeTeam(team.id)"
          class="h-4 w-4 mr-2 ml-auto cursor-pointer text-foreground"
        />
      </NavTrigger>
    </div>
  </div>
</template>
