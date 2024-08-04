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

  updatePicture(data: { picture: string }) {
    return this.axios.put(`/users/picture`, data).then((res) => res.data);
  }
}
