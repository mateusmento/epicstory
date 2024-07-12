import { createAxios } from "@/core/axios";
import { IssueService } from "@/domain/issue/issue.service";
import { WorkspaceService } from "@/domain/workspace/workspace.service";
import { Axios } from "axios";
import { container as tsyringe } from "tsyringe";
import { ProjectService } from "@/domain/project/project.service";

export async function createDependencies() {
  const { default: config } = await import("./config");
  const axios = createAxios({ baseURL: config.API_URL });
  const container = tsyringe.createChildContainer();
  container.registerInstance(Axios, axios);
  container.registerSingleton(WorkspaceService);
  container.registerSingleton(ProjectService);
  container.registerSingleton(IssueService);
  return container;
}
