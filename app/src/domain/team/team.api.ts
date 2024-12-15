import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";

@injectable()
export class TeamApi {
  constructor(@InjectAxios() private axios: Axios) {}

  findTeam(id: number) {
    return this.axios.get(`/teams/${id}`).then((res) => res.data);
  }

  findMembers(id: number) {
    return this.axios.get(`/teams/${id}/members`).then((res) => res.data);
  }

  addMember(id: number, userId: number) {
    return this.axios.post(`/teams/${id}/members`, { userId }).then((res) => res.data);
  }

  removeMember(memberId: number) {
    return this.axios.delete(`/team-members/${memberId}`).then((res) => res.data);
  }
}
