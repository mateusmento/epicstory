import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { Label } from "../types";

export type CreateLabelData = {
  name: string;
  color: string;
};

@injectable()
export class LabelApi {
  constructor(@InjectAxios() private axios: Axios) {}

  fetchLabels(workspaceId: number) {
    return this.axios.get<Label[]>(`/workspaces/${workspaceId}/labels`).then((res) => res.data);
  }

  createLabel(workspaceId: number, data: CreateLabelData) {
    return this.axios.post<Label>(`/workspaces/${workspaceId}/labels`, data).then((res) => res.data);
  }
}

