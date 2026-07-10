import type {
  IPage,
  IPageQuery,
  Project,
  Team,
  IWorkspace,
  TransferWorkspaceOwnershipBody,
  WorkspaceMember,
} from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

@injectable()
export class WorkspaceApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  acceptWorkspaceMemberInvite(inviteId: string | number) {
    return this.axios
      .put(`/workspace-member-invites/${inviteId}/accepted`)
      .then((res) => res.data);
  }

  findWorkspace(workspaceId: number) {
    return this.axios
      .get<IWorkspace>(`workspaces/${workspaceId}`)
      .then((res) => res.data);
  }

  findWorkspaces() {
    return this.axios
      .get<{ content: IWorkspace[] }>("workspaces")
      .then((res) => res.data);
  }

  create(data: { name: string }) {
    return this.axios.post("workspaces", data).then((res) => res.data);
  }

  createWorkspace(name: string) {
    return this.axios
      .post<IWorkspace>("/workspaces", { name })
      .then((res) => res.data);
  }

  findMembers(
    workspaceId: number,
    query?: {
      page?: number;
      count?: number;
      q?: string;
      name?: string;
      username?: string;
    },
  ) {
    return this.axios
      .get<
        IPage<WorkspaceMember>
      >(`workspaces/${workspaceId}/members`, { params: query })
      .then((res) => res.data);
  }

  addMember(workspaceId: number, data: { userId: number }) {
    return this.axios
      .post(`workspaces/${workspaceId}/members`, data)
      .then((res) => res.data);
  }

  sendMemberInvite(
    workspaceId: number,
    data: { invites: { email: string; userId?: number }[] },
  ) {
    return this.axios
      .post(`workspaces/${workspaceId}/member-invites`, data)
      .then((res) => res.data);
  }

  removeMember(workspaceId: number, memberId: number) {
    return this.axios
      .delete(`workspaces/${workspaceId}/members/${memberId}`)
      .then((res) => res.data);
  }

  transferOwnership(workspaceId: number, body: TransferWorkspaceOwnershipBody) {
    return this.axios
      .post(`workspaces/${workspaceId}/transfer-ownership`, body)
      .then((res) => res.data);
  }

  findProjects(
    workspaceId: number,
    query?: Partial<IPageQuery> & { teamId?: number },
  ) {
    return this.axios
      .get<
        IPage<Project>
      >(`workspaces/${workspaceId}/projects`, { params: query })
      .then((res) => res.data);
  }

  findRecentProjects(workspaceId: number, query?: { count?: number }) {
    return this.axios
      .get<Project[]>(`workspaces/${workspaceId}/projects/recent`, {
        params: query,
      })
      .then((res) => res.data);
  }

  suggestProjectKeyPrefix(workspaceId: number, name: string) {
    return this.axios
      .get<{
        issueKeyPrefix: string;
      }>(`workspaces/${workspaceId}/projects/suggest-key`, { params: { name } })
      .then((res) => res.data);
  }

  createProject(
    workspaceId: number,
    data: { name: string; issueKeyPrefix?: string; teamId: number },
  ) {
    return this.axios
      .post(`workspaces/${workspaceId}/projects`, data)
      .then((res) => res.data);
  }

  removeProject(projectId: number) {
    return this.axios.delete(`projects/${projectId}`).then((res) => res.data);
  }

  findTeams(workspaceId: number) {
    return this.axios
      .get<Team[]>(`workspaces/${workspaceId}/teams`)
      .then((res) => res.data);
  }

  createTeam(workspaceId: number, data: { name: string; members: number[] }) {
    return this.axios
      .post<Team>(`workspaces/${workspaceId}/teams`, data)
      .then((res) => res.data);
  }

  removeTeam(teamId: number) {
    return this.axios.delete(`/teams/${teamId}`).then((res) => res.data);
  }
}
