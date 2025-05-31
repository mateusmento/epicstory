import { useDependency } from "@/core/dependency-injection";
import { ref } from "vue";
import { WorkspaceApi } from "../services/workspace.service";
import type { Workspace } from "../types/workspace.type";

export function useWorkspaces() {
  const workspaces = ref<Workspace[]>([]);
  const workspaceApi = useDependency(WorkspaceApi);

  async function fetchWorkspaces() {
    const { content } = await workspaceApi.findWorkspaces();
    workspaces.value = content;
  }

  async function createWorkspace(data: { name: string }) {
    const workspace = await workspaceApi.createWorkspace(data.name);
    workspaces.value.push(workspace);
    return workspace;
  }

  return { workspaces, fetchWorkspaces, createWorkspace };
}
