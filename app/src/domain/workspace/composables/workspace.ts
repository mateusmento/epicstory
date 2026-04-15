import { useDependency } from "@/core/dependency-injection";
import type { PageQuery } from "@/core/types";
import { StorageSerializers, useStorage } from "@vueuse/core";
import { defineStore, storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { WorkspaceApi } from "../services";
import type { Project, Team, Workspace, WorkspaceMember } from "../types";

export const useWorkspaceStore = defineStore("workspace", () => {
  const workspace = useStorage<Workspace>("workspace", null, localStorage, {
    serializer: StorageSerializers.object,
    mergeDefaults: true,
  });

  const members = ref<WorkspaceMember[]>([]);
  const teams = ref<Team[]>([]);

  const projects = ref<Project[]>([]);

  const projectsPage = ref({
    page: 0,
    count: 50,
    hasNext: false,
    hasPrevious: false,
    total: 0,
  });

  return { workspace, members, projects, projectsPage, teams };
});

export function useWorkspace() {
  const store = useWorkspaceStore();
  const workspaceApi = useDependency(WorkspaceApi);

  const workspaceId = computed(() => {
    if (!store.workspace) {
      throw new Error("Workspace was not provided");
    }

    return store.workspace.id;
  });

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

  async function fetchProjects(pageQuery?: PageQuery) {
    const page = await workspaceApi.findProjects(workspaceId.value, pageQuery);
    store.projects = page.content;
    store.projectsPage = page;
  }

  const isFetchingMoreProjects = ref(false);
  async function fetchMoreProjects() {
    if (isFetchingMoreProjects.value) return;
    if (!store.projectsPage?.hasNext) return;

    isFetchingMoreProjects.value = true;
    try {
      const nextPage = (store.projectsPage?.page ?? 0) + 1;
      const page = await workspaceApi.findProjects(workspaceId.value, {
        page: nextPage,
        count: store.projectsPage?.count ?? 50,
        orderBy: "id",
        order: "asc",
      });

      // append, de-dupe by id (defensive)
      const byId = new Map<number, Project>();
      for (const p of store.projects) byId.set(p.id, p);
      for (const p of page.content) byId.set(p.id, p);
      store.projects = Array.from(byId.values());
      store.projectsPage = page;
    } finally {
      isFetchingMoreProjects.value = false;
    }
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
    isFetchingMoreProjects,
    workspaceId,
    fetchWorkspace,
    fetchWorkspaceMembers,
    addWorkspaceMember,
    sendWorkspaceMemberInvite,
    fetchProjects,
    fetchMoreProjects,
    createProject,
    removeProject,
    fetchTeams,
    createTeam,
    removeTeam,
    removeMember,
  };
}
