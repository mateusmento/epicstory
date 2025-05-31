import { createAxios } from "@/core/axios";
import { IssueApi } from "@/domain/issues";
import { WorkspaceApi } from "@/domain/workspace";
import { Axios } from "axios";
import { container as tsyringe } from "tsyringe";
import { ProjectApi } from "@/domain/project";
import { TeamApi } from "@/domain/team/team.api";
import { MeetingApi } from "@/domain/channels/services/meeting.api";
import { ChannelService } from "@/domain/channels";
import { config } from "@/config";

export async function createDependencies() {
  const axios = createAxios({ baseURL: config.API_URL });
  const container = tsyringe.createChildContainer();
  container.registerInstance(Axios, axios);
  container.registerSingleton(WorkspaceApi);
  container.registerSingleton(ProjectApi);
  container.registerSingleton(IssueApi);
  container.registerSingleton(TeamApi);
  container.registerSingleton(ChannelService);
  container.registerSingleton(MeetingApi);
  return container;
}
