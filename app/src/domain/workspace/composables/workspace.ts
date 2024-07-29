import { useDependency } from "@/core/dependency-injection";
import { defineStore, storeToRefs } from "pinia";
import { ref, watch } from "vue";
import { WorkspaceService } from "../services";
import type { Project, Team, Workspace, WorkspaceMember } from "../types";

const getLocalStorage = (name: string) => {
  const json = localStorage.getItem(name);
  return json ? JSON.parse(json) : null;
};

const setLocalStorage = (name: string, value: Record<any, any> | null) => {
  if (value) localStorage.setItem(name, JSON.stringify(value));
  else localStorage.removeItem(name);
};

const useWorkspaceStore = defineStore("workspace", () => {
  const workspace = ref<Workspace | null>(getLocalStorage("workspace"));
  watch(workspace, (value) => setLocalStorage("workspace", value));

  const members = ref<WorkspaceMember[]>([]);
  const teams = ref<Team[]>([]);
  const projects = ref<Project[]>([]);

  return { workspace, members, teams, projects };
});

export function useWorkspace() {
  const store = useWorkspaceStore();

  const workspaceService = useDependency(WorkspaceService);

  function selectWorkspace(workspace: Workspace) {
    store.workspace = workspace;
  }

  async function fetchWorkspaceMembers() {
    if (!store.workspace) return;
    store.members = await workspaceService.findMembers(store.workspace.id);
  }

  async function addWorkspaceMember(userId: number) {
    if (!store.workspace) return;
    const member = await workspaceService.addMember(store.workspace.id, { userId });
    store.members.push(member);
  }

  async function fetchProjects() {
    if (!store.workspace) return;
    store.projects = await workspaceService.findProjects(store.workspace.id);
  }

  async function createProject(data: { name: string }) {
    if (!store.workspace) return;
    const project = await workspaceService.createProject(store.workspace.id, data);
    store.projects.push(project);
  }

  async function fetchTeams() {
    if (!store.workspace) return;
    store.teams = await workspaceService.findTeams(store.workspace.id);
  }

  async function createTeam(name: string, members: WorkspaceMember[] = []) {
    if (!store.workspace) return;
    const ids = members.map((m) => m.id);
    const team = await workspaceService.createTeam(store.workspace.id, { name, members: ids });
    store.teams.push(team);
  }

  return {
    ...storeToRefs(store),
    selectWorkspace,
    fetchWorkspaceMembers,
    addWorkspaceMember,
    fetchProjects,
    createProject,
    fetchTeams,
    createTeam,
  };
}
