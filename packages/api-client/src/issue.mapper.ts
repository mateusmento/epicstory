import type { IIssue, IPage, UpdateIssueData } from "@epicstory/contracts";
import { isValid } from "date-fns";

export type UpdateIssueDataWire = Omit<UpdateIssueData, "dueDate"> & {
  dueDate?: string | null;
};

export type IIssueWire = Omit<
  IIssue,
  "dueDate" | "parentIssue" | "subIssues"
> & {
  dueDate: string | null;
  parentIssue?: IIssueWire | null;
  subIssues?: IIssueWire[];
};

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isValid(date) ? date : null;
}

export function toISOString(value: Date | null | undefined): string | null {
  if (value == null) return null;
  return value.toISOString();
}

export function mapIssue(apiIssue: IIssueWire): IIssue {
  return {
    ...apiIssue,
    issueType: apiIssue.issueType ?? "task",
    startsAt: apiIssue.startsAt ?? null,
    endsAt: apiIssue.endsAt ?? null,
    dueDate: parseDate(apiIssue.dueDate),
    parentIssue:
      apiIssue.parentIssue != null
        ? mapIssue(apiIssue.parentIssue)
        : apiIssue.parentIssue,
    subIssues: apiIssue.subIssues?.map(mapIssue),
  };
}

export function mapPageIssues(page: IPage<IIssueWire>): IPage<IIssue> {
  return { ...page, content: page.content.map(mapIssue) };
}

export function wireUpdateIssueData(
  data: UpdateIssueData,
): UpdateIssueDataWire {
  const { dueDate, ...rest } = data;
  const payload: UpdateIssueDataWire = { ...rest };
  if (dueDate !== undefined) {
    payload.dueDate = dueDate === null ? null : dueDate.toISOString();
  }
  return payload;
}
