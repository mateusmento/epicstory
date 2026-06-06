/** Values stored in `issue_activities.type` — DB source of truth. */
export type IssueActivityType =
  | 'issue_created'
  | 'comment_created'
  | 'title_changed'
  | 'description_changed'
  | 'status_changed'
  | 'priority_changed'
  | 'due_date_changed'
  | 'assignees_changed'
  | 'labels_changed'
  | 'parent_changed'
  | 'attachment_added';

export type TitleChangedPayload = {
  previousTitle?: string | null;
  /** Snapshot after the change (for activity feed copy). */
  newTitle?: string | null;
};
export type DescriptionChangedPayload = {
  changeKind?: 'edited' | 'cleared';
  /** Short plain excerpt of the body after edit. */
  excerpt?: string | null;
};
export type StatusChangedPayload = {
  previousStatus: string | null;
  newStatus?: string | null;
};
export type PriorityChangedPayload = {
  previousPriority?: number | null;
  newPriority?: number | null;
};
export type DueDateChangedPayload = {
  previousDueDate?: string | null;
  newDueDate?: string | null;
};
export type AssigneesChangedPayload = {
  addedUserIds: number[];
  removedUserIds: number[];
  addedUserNames?: string[];
  removedUserNames?: string[];
};
export type LabelsChangedPayload = {
  addedLabelIds: number[];
  removedLabelIds: number[];
  addedLabelNames?: string[];
  removedLabelNames?: string[];
};
export type ParentChangedPayload = {
  previousParentIssueId?: number | null;
  newParentIssueId?: number | null;
  previousParentIssueKey?: string | null;
  newParentIssueKey?: string | null;
};
export type EmptyPayload = Record<string, never>;

export type IssueActivityPayload =
  | TitleChangedPayload
  | DescriptionChangedPayload
  | StatusChangedPayload
  | PriorityChangedPayload
  | DueDateChangedPayload
  | AssigneesChangedPayload
  | LabelsChangedPayload
  | ParentChangedPayload
  | EmptyPayload;

export type IssueActivityPayloadFor<T extends IssueActivityType> =
  T extends 'title_changed'
    ? TitleChangedPayload
    : T extends 'description_changed'
      ? DescriptionChangedPayload
      : T extends 'status_changed'
        ? StatusChangedPayload
        : T extends 'priority_changed'
          ? PriorityChangedPayload
          : T extends 'due_date_changed'
            ? DueDateChangedPayload
            : T extends 'assignees_changed'
              ? AssigneesChangedPayload
              : T extends 'labels_changed'
                ? LabelsChangedPayload
                : T extends 'parent_changed'
                  ? ParentChangedPayload
                  : EmptyPayload | null;
