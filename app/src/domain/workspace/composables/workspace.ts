import { useDependency } from "@/core/dependency-injection";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { WorkspaceService } from "../services";
import type { Workspace, WorkspaceMember } from "../types";

const useWorkspaceStore = defineStore("workspace", () => {
  const workspace = ref<Workspace>();
  const members = ref<WorkspaceMember[]>([]);
  return { workspace, members };
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
    await workspaceService.addMember(store.workspace.id, { userId });
  }

  return {
    ...storeToRefs(store),
    selectWorkspace,
    fetchWorkspaceMembers,
    addWorkspaceMember,
  };
}
