import { createAxios } from "@/core/axios";
import { IssueApi } from "@/domain/issues";
import { WorkspaceService } from "@/domain/workspace";
import { Axios } from "axios";
import { container as tsyringe } from "tsyringe";
import { ProjectService } from "@/domain/project";
import { TeamApi } from "@/domain/team/team.api";

export async function createDependencies() {
  const { default: config } = await import("./config");
  const axios = createAxios({ baseURL: config.API_URL });
  const container = tsyringe.createChildContainer();
  container.registerInstance(Axios, axios);
  container.registerSingleton(WorkspaceService);
  container.registerSingleton(ProjectService);
  container.registerSingleton(IssueApi);
  container.registerSingleton(TeamApi);
  return container;
}
