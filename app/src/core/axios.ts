import axios, { Axios, type CreateAxiosDefaults } from "axios";
import { injectWithTransform } from "tsyringe";
import type { Transform } from "tsyringe/dist/typings/types";

export class UnauthorizedException extends Error {
  constructor(public error: Error) {
    super("401 Unauthorized");
  }
}

export function createAxios(options?: CreateAxiosDefaults) {
  const instance = axios.create({ ...options, withCredentials: true });

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      return err.response?.status === 401
        ? Promise.reject(new UnauthorizedException(err))
        : Promise.reject(err);
    },
  );

  return instance;
}

class TransformAxios implements Transform<Axios, Axios> {
  transform(axios: Axios, options: CreateAxiosDefaults): Axios {
    return options ? createAxios(options) : axios;
  }
}

export function InjectAxios(options?: CreateAxiosDefaults) {
  return injectWithTransform(Axios, TransformAxios, options);
}
