import { http, HttpResponse } from "msw";
import config from "./config";

const API_URL = config.API_URL;

export function mockAuthAccessEndpoint() {
  return http.get(`${API_URL}/auth/access`, () => {
    return HttpResponse.json({ id: 1, name: "Mateus Sarmento" });
  });
}

export function mockSigninEndpoint() {
  return http.post(`${API_URL}/auth/tokens`, () => {
    return HttpResponse.json({ token: "", user: {} });
  });
}

export function mockSignupEndpoint() {
  let counter = 1;
  return http.post(`${API_URL}/auth/users`, async ({ request }) => {
    const body: any = await request.json();
    return HttpResponse.json({ id: counter++, ...body });
  });
}

export function mockCreateWorkspaceEndpoint() {
  let counter = 1;
  return http.post(`${API_URL}/workspaces`, async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({ id: counter++, name: body.name });
  });
}

export function mockCreateProjectEndpoint() {
  let counter = 1;
  return http.post(`${API_URL}/workspaces/1/projects`, async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({ id: counter++, workspaceId: 1, name: body.name });
  });
}

export function mockCreateIssueEndpoint() {
  let counter = 1;
  return http.post(`${API_URL}/projects/:projectId/issues`, async ({ request, params }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({ id: ++counter, projectId: params.projectId, title: body.title });
  });
}
