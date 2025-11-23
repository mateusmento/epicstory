import { useDependency } from "@/core/dependency-injection";
import { StorageSerializers, useStorage } from "@vueuse/core";
import { defineStore, storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { WorkspaceApi } from "../services";
import type { Project, Team, Workspace, WorkspaceMember } from "../types";

export const useWorkspaceStore = defineStore("workspace", () => {
  const workspace = useStorage<Workspace>("workspace", null, localStorage, {
    serializer: StorageSerializers.object,
    mergeDefaults: true,
  });

  const members = ref<WorkspaceMember[]>([]);
  const projects = ref<Project[]>([]);
  const teams = ref<Team[]>([]);

  return { workspace, members, projects, teams };
});

export function useWorkspace() {
  const store = useWorkspaceStore();
  const router = useRouter();
  const workspaceApi = useDependency(WorkspaceApi);

  const workspaceId = computed(() => {
    if (!store.workspace) {
      throw new Error("Workspace was not provided");
    }

    return store.workspace.id;
  });

  const selectWorkspace = (workspace: Workspace) => {
    router.push(`/${workspace.id}`);
  };

  async function fetchWorkspace(workspaceId: number) {
    store.workspace = await workspaceApi.findWorkspace(workspaceId);
  }

  async function fetchWorkspaceMembers() {
    store.members = await workspaceApi.findMembers(workspaceId.value);
  }

  async function addWorkspaceMember(userId: number) {
    const member = await workspaceApi.addMember(workspaceId.value, { userId });
    store.members.push(member);
  }

  async function sendWorkspaceMemberInvite(email: string, userId: number) {
    await workspaceApi.sendMemberInvite(workspaceId.value, { email, userId });
  }

  async function fetchProjects() {
    store.projects = await workspaceApi.findProjects(workspaceId.value);
  }

  async function createProject(data: { name: string }) {
    const project = await workspaceApi.createProject(workspaceId.value, data);
    store.projects.push(project);
  }

  async function removeProject(projectId: number) {
    await workspaceApi.removeProject(projectId);
    store.projects = store.projects.filter((p) => p.id !== projectId);
  }

  async function fetchTeams() {
    store.teams = await workspaceApi.findTeams(workspaceId.value);
  }

  async function createTeam(name: string, members: WorkspaceMember[] = []) {
    const ids = members.map((m) => m.id);
    const team = await workspaceApi.createTeam(workspaceId.value, { name, members: ids });
    store.teams.push(team);
  }

  async function removeTeam(teamId: number) {
    await workspaceApi.removeTeam(teamId);
    store.teams = store.teams.filter((t) => t.id !== teamId);
  }

  async function removeMember(memberId: number) {
    await workspaceApi.removeMember(workspaceId.value, memberId);
    store.members = store.members.filter((m) => m.id !== memberId);
  }

  return {
    ...storeToRefs(store),
    selectWorkspace,
    fetchWorkspace,
    fetchWorkspaceMembers,
    addWorkspaceMember,
    sendWorkspaceMemberInvite,
    fetchProjects,
    createProject,
    removeProject,
    fetchTeams,
    createTeam,
    removeTeam,
    removeMember,
  };
}
