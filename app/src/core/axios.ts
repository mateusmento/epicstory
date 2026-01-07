import axios, { Axios, type CreateAxiosDefaults } from "axios";
import { injectWithTransform } from "tsyringe";
import type { Transform } from "tsyringe/dist/typings/types";

export class UnauthorizedException extends Error {
  constructor(public error: Error) {
    super("401 Unauthorized");
  }
}

export class NotFoundException extends Error {
  constructor(public error: Error) {
    super("404 Not Found");
  }
}

export class ForbiddenException extends Error {
  constructor(public error: Error) {
    super("403 Forbidden");
  }
}

export function createAxios(options?: CreateAxiosDefaults) {
  const instance = axios.create({ ...options, withCredentials: true });

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 404) {
        return Promise.reject(new NotFoundException(err));
      }
      if (err.response?.status === 403) {
        return Promise.reject(new ForbiddenException(err));
      }
      if (err.response?.status === 401) {
        return Promise.reject(new UnauthorizedException(err));
      }
      return Promise.reject(err);
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
