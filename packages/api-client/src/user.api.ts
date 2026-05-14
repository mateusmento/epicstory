import type { Page, IUser } from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

@injectable()
export class UserApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  findUsers(username: string, opts?: { page?: number; count?: number }) {
    return this.axios
      .get<
        Page<IUser>
      >(`/auth/users`, { params: { username, page: opts?.page, count: opts?.count } })
      .then((res) => res.data);
  }

  findUsersByName(name: string, opts?: { page?: number; count?: number }) {
    return this.axios
      .get<
        Page<IUser>
      >(`/auth/users`, { params: { name, page: opts?.page, count: opts?.count } })
      .then((res) => res.data);
  }

  updatePicture(data: FormData) {
    return this.axios.put(`/users/picture`, data).then((res) => res.data);
  }

  update(data: Record<string, unknown>) {
    return this.axios.patch(`/users`, data).then((res) => res.data);
  }

  changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.axios.patch(`/users/password`, data).then((res) => res.data);
  }
}
