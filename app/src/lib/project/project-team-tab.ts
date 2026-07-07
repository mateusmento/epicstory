import type { Project } from "@epicstory/contracts";

export type ProjectTeamView = "backlog" | "board" | "sprint";

export type ProjectTeamTab = {
  id: number;
  name: string;
  to: string;
};

export function projectTeamTabHref(workspaceId: number, projectId: number, view: ProjectTeamView) {
  return `/${workspaceId}/project/${projectId}/${view}`;
}

export function toProjectTeamTab(
  project: Pick<Project, "id" | "name">,
  workspaceId: number,
  view: ProjectTeamView,
): ProjectTeamTab {
  return {
    id: project.id,
    name: project.name,
    to: projectTeamTabHref(workspaceId, project.id, view),
  };
}
