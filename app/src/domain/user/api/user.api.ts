import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";

@injectable()
export class UserApi {
  constructor(@InjectAxios() private axios: Axios) {}

  updatePicture(data: { picture: string }) {
    return this.axios.put(`/users/picture`, data).then((res) => res.data);
  }
}
