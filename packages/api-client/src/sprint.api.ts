import type {
  CompleteSprintResult,
  FindSprintsQuery,
  ISprint,
  ISprintItem,
  SprintStatus,
} from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

@injectable()
export class SprintApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  findSprints(teamId: number, query?: FindSprintsQuery): Promise<ISprint[]> {
    return this.axios
      .get<ISprint[]>(`/teams/${teamId}/sprints`, { params: query })
      .then((res) => res.data);
  }

  createSprint(teamId: number): Promise<ISprint> {
    return this.axios
      .post<ISprint>(`/teams/${teamId}/sprints`)
      .then((res) => res.data);
  }

  startSprint(sprintId: number): Promise<ISprint> {
    return this.axios
      .put<ISprint>(`/sprints/${sprintId}/start`)
      .then((res) => res.data);
  }

  completeSprint(sprintId: number): Promise<CompleteSprintResult> {
    return this.axios
      .put<CompleteSprintResult>(`/sprints/${sprintId}/complete`)
      .then((res) => res.data);
  }

  findSprintItems(sprintId: number): Promise<ISprintItem[]> {
    return this.axios
      .get<ISprintItem[]>(`/sprints/${sprintId}/items`)
      .then((res) => res.data);
  }

  addSprintItem(sprintId: number, issueId: number): Promise<ISprintItem> {
    return this.axios
      .post<ISprintItem>(`/sprints/${sprintId}/items`, { issueId })
      .then((res) => res.data);
  }

  reorderSprintItem(
    itemId: number,
    afterOf: number | null,
  ): Promise<ISprintItem> {
    return this.axios
      .put<ISprintItem>(`/sprint-items/${itemId}/order`, { afterOf })
      .then((res) => res.data);
  }

  updateSprintItemDestination(
    itemId: number,
    destinationSprintId: number | null,
  ): Promise<ISprintItem> {
    return this.axios
      .put<ISprintItem>(`/sprint-items/${itemId}/destination`, {
        destinationSprintId,
      })
      .then((res) => res.data);
  }

  removeSprintItem(itemId: number): Promise<void> {
    return this.axios.delete(`/sprint-items/${itemId}`).then((res) => res.data);
  }
}
