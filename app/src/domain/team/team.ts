import { useDependency } from "@/core/dependency-injection";
import { TeamApi, WorkspaceApi } from "@epicstory/api-client";
import type { ITeam, ITeamMember } from "@epicstory/contracts";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";

const useTeamsStore = defineStore("teams", () => {
  const teams = ref<ITeam[]>([]);
  return { teams };
});

export function useTeams() {
  const store = useTeamsStore();
  const workspaceApi = useDependency(WorkspaceApi);

  async function fetchTeams(workspaceId: number) {
    store.teams = await workspaceApi.findTeams(workspaceId);
    return store.teams;
  }

  return { ...storeToRefs(store), fetchTeams };
}

export const useTeamStore = defineStore("team", () => {
  const team = ref<ITeam>();
  const members = ref<ITeamMember[]>();
  return { team, members };
});

export function useTeam() {
  const store = useTeamStore();

  const teamApi = useDependency(TeamApi);

  async function fetchTeam(id: number) {
    store.team = await teamApi.findTeam(id);
    store.members = await teamApi.findMembers(id);
  }

  async function addMember(userId: number) {
    if (!store.team) return;
    const member = await teamApi.addMember(store.team.id, userId);
    store.members?.unshift(member);
  }

  async function removeMember(memberId: number) {
    await teamApi.removeMember(memberId);
    store.members = store.members?.filter((m) => m.id !== memberId);
  }

  return {
    ...storeToRefs(store),
    fetchTeam,
    addMember,
    removeMember,
  };
}
