import {
  AuthApi,
  BacklogApi,
  CalendarEventApi,
  ChannelApi,
  IssueApi,
  LabelApi,
  LinearIntegrationApi,
  MeetingApi,
  NotificationApi,
  ProjectApi,
  TeamApi,
  UserApi,
  WorkspaceApi,
} from "@epicstory/api-client";
import { createAxios } from "@/core/axios";
import { Axios } from "axios";
import { container as tsyringe } from "tsyringe";
import { config } from "@/config";

export async function createDependencies() {
  const axios = createAxios({ baseURL: config.API_URL });
  const container = tsyringe.createChildContainer();
  container.registerInstance(Axios, axios);

  container.registerSingleton(AuthApi);
  container.registerSingleton(UserApi);
  container.registerSingleton(LabelApi);
  container.registerSingleton(IssueApi);
  container.registerSingleton(BacklogApi);
  container.registerSingleton(ChannelApi);
  container.registerSingleton(MeetingApi);
  container.registerSingleton(WorkspaceApi);
  container.registerSingleton(ProjectApi);
  container.registerSingleton(TeamApi);
  container.registerSingleton(CalendarEventApi);
  container.registerSingleton(NotificationApi);
  container.registerSingleton(LinearIntegrationApi);

  return container;
}
