import { useDependency } from "@/core/dependency-injection";
import { ref } from "vue";
import { WorkspaceApi } from "@epicstory/api-client";
import type { IWorkspace } from "@epicstory/contracts";

export function useWorkspaces() {
  const workspaces = ref<IWorkspace[]>([]);
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
