import type { ITeam, ITeamMember, TeamTimeline } from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";
import { mapIssue, type IIssueWire } from "./issue.mapper";

@injectable()
export class TeamApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  findTeam(id: number): Promise<ITeam> {
    return this.axios.get(`/teams/${id}`).then((res) => res.data);
  }

  findTeamTimeline(teamId: number): Promise<TeamTimeline> {
    return this.axios.get(`/teams/${teamId}/timeline`).then((res) => {
      const data = res.data as {
        projects: TeamTimeline["projects"];
        epics: IIssueWire[];
        dependencies: TeamTimeline["dependencies"];
      };
      return {
        projects: data.projects,
        epics: data.epics.map(mapIssue),
        dependencies: data.dependencies,
      };
    });
  }

  findMembers(id: number) {
    return this.axios.get(`/teams/${id}/members`).then((res) => res.data);
  }

  addMember(id: number, userId: number) {
    return this.axios
      .post(`/teams/${id}/members`, { userId })
      .then((res) => res.data);
  }

  removeMember(memberId: number) {
    return this.axios
      .delete(`/team-members/${memberId}`)
      .then((res) => res.data);
  }
}
