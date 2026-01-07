import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { User } from "../types";

@injectable()
export class UserApi {
  constructor(@InjectAxios() private axios: Axios) {}

  findUsers(username: string) {
    return this.axios.get<User[]>(`/auth/users`, { params: { username } }).then((res) => res.data);
  }

  findUsersByName(name: string) {
    return this.axios.get<User[]>(`/auth/users`, { params: { name } }).then((res) => res.data);
  }

  updatePicture(data: FormData) {
    return this.axios.put(`/users/picture`, data).then((res) => res.data);
  }

  update(data: any) {
    return this.axios.patch(`/users`, data).then((res) => res.data);
  }

  changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.axios.patch(`/users/password`, data).then((res) => res.data);
  }
}
