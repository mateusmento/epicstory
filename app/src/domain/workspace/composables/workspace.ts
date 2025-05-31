import { useDependency } from "@/core/dependency-injection";
import { useStorage, StorageSerializers } from "@vueuse/core";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { WorkspaceApi } from "../services";
import type { Project, Team, Workspace, WorkspaceMember } from "../types";

const useWorkspaceStore = defineStore("workspace", () => {
  const workspace = useStorage<Workspace | null>("workspace", null, localStorage, {
    serializer: StorageSerializers.object,
    mergeDefaults: true,
  });

  const members = ref<WorkspaceMember[]>([]);
  const teams = ref<Team[]>([]);
  const projects = ref<Project[]>([]);

  return { workspace, members, teams, projects };
});

export function useWorkspace() {
  const store = useWorkspaceStore();

  const workspaceApi = useDependency(WorkspaceApi);

  function selectWorkspace(workspace: Workspace) {
    store.workspace = workspace;
  }

  async function fetchWorkspaceMembers() {
    if (!store.workspace) return;
    store.members = await workspaceApi.findMembers(store.workspace.id);
  }

  async function addWorkspaceMember(userId: number) {
    if (!store.workspace) return;
    const member = await workspaceApi.addMember(store.workspace.id, { userId });
    store.members.push(member);
  }

  async function sendWorkspaceMemberInvite(email: string, userId: number) {
    if (!store.workspace) return;
    await workspaceApi.sendMemberInvite(store.workspace.id, { email, userId });
  }

  async function fetchProjects() {
    if (!store.workspace) return;
    store.projects = await workspaceApi.findProjects(store.workspace.id);
  }

  async function createProject(data: { name: string }) {
    if (!store.workspace) return;
    const project = await workspaceApi.createProject(store.workspace.id, data);
    store.projects.push(project);
  }

  async function removeProject(projectId: number) {
    await workspaceApi.removeProject(projectId);
    store.projects = store.projects.filter((p) => p.id !== projectId);
  }

  async function fetchTeams() {
    if (!store.workspace) return;
    store.teams = await workspaceApi.findTeams(store.workspace.id);
  }

  async function createTeam(name: string, members: WorkspaceMember[] = []) {
    if (!store.workspace) return;
    const ids = members.map((m) => m.id);
    const team = await workspaceApi.createTeam(store.workspace.id, { name, members: ids });
    store.teams.push(team);
  }

  async function removeTeam(teamId: number) {
    await workspaceApi.removeTeam(teamId);
    store.teams = store.teams.filter((t) => t.id !== teamId);
  }

  return {
    ...storeToRefs(store),
    selectWorkspace,
    fetchWorkspaceMembers,
    addWorkspaceMember,
    sendWorkspaceMemberInvite,
    fetchProjects,
    createProject,
    removeProject,
    fetchTeams,
    createTeam,
    removeTeam,
  };
}
