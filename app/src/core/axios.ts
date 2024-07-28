import axios, { Axios, type CreateAxiosDefaults } from "axios";
import { injectWithTransform } from "tsyringe";
import type { Transform } from "tsyringe/dist/typings/types";

export function createAxios(options?: CreateAxiosDefaults) {
  return axios.create({ ...options, withCredentials: true });
}

class TransformAxios implements Transform<Axios, Axios> {
  transform(axios: Axios, options: CreateAxiosDefaults): Axios {
    return options ? createAxios(options) : axios;
  }
}

export function InjectAxios(options?: CreateAxiosDefaults) {
  return injectWithTransform(Axios, TransformAxios, options);
}
