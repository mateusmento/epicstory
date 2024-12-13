import { ref } from "vue";
import type { Project } from "../types/project.type";
import { useDependency } from "@/core/dependency-injection";
import { WorkspaceService } from "@/domain/workspace";

export function useProjects(workspaceId: number) {
  const projects = ref<Project[]>([]);
  const workspaceService = useDependency(WorkspaceService);

  async function fetchProjects() {
    projects.value = await workspaceService.findProjects(workspaceId);
  }

  async function createProject({ workspaceId, ...data }: { workspaceId: number; name: string }) {
    const project = await workspaceService.createProject(workspaceId, data);
    projects.value.push(project);
  }

  async function removeProject(projectId: number) {
    await workspaceService.removeProject(projectId);
    projects.value = projects.value.filter((p) => p.id !== projectId);
  }

  return { projects, fetchProjects, createProject, removeProject };
}
