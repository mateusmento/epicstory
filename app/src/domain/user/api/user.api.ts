import { InjectAxios } from "@/core/axios";
import type { Page } from "@/core/types";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { User } from "../types";

@injectable()
export class UserApi {
  constructor(@InjectAxios() private axios: Axios) {}

  findUsers(username: string, opts?: { page?: number; count?: number }) {
    return this.axios
      .get<Page<User>>(`/auth/users`, { params: { username, page: opts?.page, count: opts?.count } })
      .then((res) => res.data);
  }

  findUsersByName(name: string, opts?: { page?: number; count?: number }) {
    return this.axios
      .get<Page<User>>(`/auth/users`, { params: { name, page: opts?.page, count: opts?.count } })
      .then((res) => res.data);
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
