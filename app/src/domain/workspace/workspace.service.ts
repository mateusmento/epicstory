import { InjectAxios } from '@/core/axios';
import type { Project, Workspace } from '@/domain/workspace/workspace.types';
import type { Axios } from 'axios';
import { injectable } from 'tsyringe';

@injectable()
export class WorkspaceService {
  constructor(@InjectAxios() private axios: Axios) {}

  findWorkspaces() {
    return this.axios.get<Workspace[]>('workspaces').then((res) => res.data);
  }

  create(data: { name: string }) {
    return this.axios.post('workspaces', data).then((res) => res.data);
  }

  createWorkspace(name: string) {
    return this.axios.post<Workspace>('/workspaces', { name }).then((res) => res.data);
  }

  findMembers(workspaceId: number) {
    return this.axios.get(`workspaces/${workspaceId}/members`).then((res) => res.data);
  }

  addMember(workspaceId: number, data: { userId: number }) {
    return this.axios.post(`workspaces/${workspaceId}/members`, data).then((res) => res.data);
  }

  removeMember(workspaceId: number, memberId: number) {
    return this.axios.delete(`workspaces/${workspaceId}/members/${memberId}`);
  }

  findProjects(workspaceId: number) {
    return this.axios.get<Project[]>(`workspaces/${workspaceId}/projects`).then((res) => res.data);
  }

  createProject(workspaceId: number, data: { name: string }) {
    return this.axios.post(`workspaces/${workspaceId}/projects`, data).then((res) => res.data);
  }

  createTeam(workspaceId: number, data: { name: string; members: number[] }) {
    return this.axios.post(`workspaces/${workspaceId}/teams`, data).then((res) => res.data);
  }
}
