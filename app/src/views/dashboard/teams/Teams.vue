<script lang="ts" setup>
import { Button, Field, Form } from "@/design-system";
import { useWorkspace } from "@/domain/workspace";
import { onMounted } from "vue";

const { teams, fetchTeams, createTeam } = useWorkspace();

onMounted(() => fetchTeams());
</script>

<template>
  <div class="flex:rows-xl p-4">
    <h1>Teams</h1>
    <div class="flex:rows-lg p-1 rounded-md bg-zinc-100 text-zinc-500 text-sm">
      <div
        v-for="team in teams"
        :key="team.id"
        class="px-2 py-1 rounded-sm hover:bg-zinc-200/60 cursor-pointer"
      >
        {{ team.name }}
      </div>
    </div>
    <Form @submit="createTeam($event.name)" class="flex:rows-lg">
      <Field label="Name" name="name" placeholder="Create new team..." />
      <Button type="submit" size="xs">Create</Button>
    </Form>
  </div>
</template>
