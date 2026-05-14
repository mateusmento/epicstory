import type {
  CreateLabelData,
  ILabel,
  UpdateLabelData,
} from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

@injectable()
export class LabelApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  fetchLabels(workspaceId: number) {
    return this.axios
      .get<ILabel[]>(`/workspaces/${workspaceId}/labels`)
      .then((res) => res.data);
  }

  createLabel(workspaceId: number, data: CreateLabelData) {
    return this.axios
      .post<ILabel>(`/workspaces/${workspaceId}/labels`, data)
      .then((res) => res.data);
  }

  updateLabel(workspaceId: number, labelId: number, data: UpdateLabelData) {
    return this.axios
      .patch<ILabel>(`/workspaces/${workspaceId}/labels/${labelId}`, data)
      .then((res) => res.data);
  }
}
