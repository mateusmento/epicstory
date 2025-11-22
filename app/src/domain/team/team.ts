import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import type { User } from "../auth";
import { useDependency } from "@/core/dependency-injection";
import { TeamApi } from "./team.api";
import type { Team } from "../workspace";

type TeamMember = {
  id: number;
  userId: number;
  user: User;
  workspaceMemberId: number;
  joinedAt: string;
};

export const useTeamStore = defineStore("team", () => {
  const team = ref<Team>();
  const members = ref<TeamMember[]>();
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
