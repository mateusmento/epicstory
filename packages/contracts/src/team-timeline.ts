import type { IIssue } from "./issue";
import type { Project } from "./workspace";

export type IssueDependency = {
  id: number;
  issueId: number;
  dependsOnIssueId: number;
};

export type TeamTimeline = {
  projects: Project[];
  epics: IIssue[];
  dependencies: IssueDependency[];
};

export type UpdateIssueScheduleBody = {
  startsAt: string | null;
  endsAt: string | null;
};

export type CreateIssueDependencyBody = {
  dependsOnIssueId: number;
};
