import { useDependency } from "@/core/dependency-injection";
import { ref } from "vue";
import { WorkspaceService } from "../services/workspace.service";
import type { Workspace } from "../types/workspace.type";

export function useWorkspaces() {
  const workspaces = ref<Workspace[]>([]);
  const workspaceService = useDependency(WorkspaceService);

  async function fetchWorkspaces() {
    const { content } = await workspaceService.findWorkspaces();
    workspaces.value = content;
  }

  async function createWorkspace(data: { name: string }) {
    const workspace = await workspaceService.createWorkspace(data.name);
    workspaces.value.push(workspace);
    return workspace;
  }

  return { workspaces, fetchWorkspaces, createWorkspace };
}
