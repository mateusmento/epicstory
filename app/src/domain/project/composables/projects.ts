import { ref } from "vue";
import type { Project } from "../types/project.type";
import { useDependency } from "@/core/dependency-injection";
import { WorkspaceApi } from "@/domain/workspace";

export function useProjects(workspaceId: number) {
  const projects = ref<Project[]>([]);
  const workspaceApi = useDependency(WorkspaceApi);

  async function fetchProjects() {
    projects.value = await workspaceApi.findProjects(workspaceId);
  }

  async function createProject({ workspaceId, ...data }: { workspaceId: number; name: string }) {
    const project = await workspaceApi.createProject(workspaceId, data);
    projects.value.push(project);
  }

  async function removeProject(projectId: number) {
    await workspaceApi.removeProject(projectId);
    projects.value = projects.value.filter((p) => p.id !== projectId);
  }

  return { projects, fetchProjects, createProject, removeProject };
}
