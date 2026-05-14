import type {
  AuthenticateResponse,
  SigninRequest,
  SigninResponse,
  SignupRequest,
  SignupResponse,
} from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

@injectable()
export class AuthApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  signup(data: SignupRequest) {
    return this.axios
      .post<SignupResponse>("/auth/users", data)
      .then((res) => res.data);
  }

  signin(data: SigninRequest) {
    return this.axios
      .post<SigninResponse>("/auth/tokens", data)
      .then((res) => res.data);
  }

  signout() {
    return this.axios.delete("/auth/tokens").then((res) => res.data);
  }

  authenticate() {
    return this.axios
      .get<AuthenticateResponse>("/auth/tokens/current")
      .then((res) => res.data);
  }
}
