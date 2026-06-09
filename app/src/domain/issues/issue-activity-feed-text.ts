import type {
  AssigneesChangedPayload,
  IIssueFeedItem,
  IUser,
  ParentChangedPayload,
} from "@epicstory/contracts";
import { formatDistanceToNow } from "date-fns";

/** Board / filter labels — keep in sync with project views. */
const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  doing: "In progress",
  done: "Done",
};

const PRIORITY_LABEL: Record<number, string> = {
  0: "No priority",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

function formatStatusKey(key: string | null | undefined): string | null {
  if (key == null || key === "") return null;
  return STATUS_LABEL[key] ?? key;
}

function formatPriorityValue(v: number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  return PRIORITY_LABEL[v] ?? `Priority ${v}`;
}

function formatDueIso(iso: string | null | undefined): string | null {
  if (iso == null || iso === "") return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

function joinEnglishList(parts: string[]): string {
  const xs = parts.filter((s) => s.trim() !== "");
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

function resolveAddedAssigneeNames(
  p: AssigneesChangedPayload | null,
  peersById: ReadonlyMap<number, IUser>,
): string[] {
  if (!p) return [];
  const fromPayload = p.addedUserNames?.filter((x) => x.trim() !== "");
  if (fromPayload?.length) return fromPayload;
  if (!p.addedUserIds.length) return [];
  return p.addedUserIds
    .map((id) => peersById.get(id)?.name)
    .filter((n): n is string => typeof n === "string" && n !== "");
}

function resolveRemovedAssigneeNames(
  p: AssigneesChangedPayload | null,
  peersById: ReadonlyMap<number, IUser>,
): string[] {
  if (!p) return [];
  const fromPayload = p.removedUserNames?.filter((x) => x.trim() !== "");
  if (fromPayload?.length) return fromPayload;
  if (!p.removedUserIds.length) return [];
  return p.removedUserIds
    .map((id) => peersById.get(id)?.name)
    .filter((n): n is string => typeof n === "string" && n !== "");
}

function resolveLabelNames(names: string[] | undefined): string[] {
  if (!names?.length) return [];
  return names.filter((x) => x.trim() !== "");
}

function resolveParentIssueKey(
  payload: ParentChangedPayload | null,
  field: "previousParentIssueKey" | "newParentIssueKey",
): string | null {
  const raw = payload?.[field];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

function parentWasSet(payload: ParentChangedPayload | null): boolean {
  return payload?.newParentIssueId != null;
}

function parentWasRemoved(payload: ParentChangedPayload | null): boolean {
  return payload?.previousParentIssueId != null && payload?.newParentIssueId == null;
}

function parentWasChanged(payload: ParentChangedPayload | null): boolean {
  const prev = payload?.previousParentIssueId;
  const next = payload?.newParentIssueId;
  return prev != null && next != null && prev !== next;
}

/** One plain sentence: "Ada changed status to Done", "Harry added Feature label". */
export function formatIssueActivitySentence(
  item: IIssueFeedItem,
  peersById: ReadonlyMap<number, IUser>,
): string {
  const actor = resolveIssueActivityActor(item, peersById);
  const name = actor.name;

  switch (item.type) {
    case "issue_created":
      return `${name} created this issue`;
    case "comment_created":
      return `${name} posted a comment`;
    case "title_changed": {
      const p = item.payload;
      const next = p?.newTitle ?? null;
      const prev = p?.previousTitle ?? null;
      if (next && prev && next !== prev) return `${name} changed title from “${prev}” to “${next}”`;
      if (next) return `${name} changed title to “${next}”`;
      return `${name} changed the title`;
    }
    case "description_changed": {
      const p = item.payload;
      if (p?.changeKind === "cleared") return `${name} cleared the description`;
      const ex = p?.excerpt?.trim() ?? "";
      if (ex) return `${name} updated the description — ${ex.length > 160 ? `${ex.slice(0, 160)}…` : ex}`;
      return `${name} updated the description`;
    }
    case "status_changed": {
      const next = formatStatusKey(item.payload?.newStatus ?? null);
      if (next) return `${name} changed status to ${next}`;
      return `${name} changed status`;
    }
    case "priority_changed": {
      const next =
        typeof item.payload?.newPriority === "number" ? formatPriorityValue(item.payload.newPriority) : null;
      if (next) return `${name} changed priority to ${next}`;
      return `${name} changed priority`;
    }
    case "due_date_changed": {
      const p = item.payload;
      const prev = formatDueIso(p?.previousDueDate ?? null);
      const next = formatDueIso(p?.newDueDate ?? null);
      if (next && prev && prev !== next) return `${name} changed due date to ${next}`;
      if (next && !prev) return `${name} set due date to ${next}`;
      if (!next && prev) return `${name} removed the due date`;
      return `${name} updated the due date`;
    }
    case "assignees_changed": {
      const p = item.payload;
      const added = resolveAddedAssigneeNames(p, peersById);
      const removed = resolveRemovedAssigneeNames(p, peersById);
      if (added.length && removed.length)
        return `${name} added assignees ${joinEnglishList(added)} and removed assignees ${joinEnglishList(removed)}`;
      if (added.length === 1) return `${name} added ${added[0]} as assignee`;
      if (added.length > 1) return `${name} added ${joinEnglishList(added)} as assignees`;
      if (removed.length === 1) return `${name} removed ${removed[0]} as assignee`;
      if (removed.length > 1) return `${name} removed ${joinEnglishList(removed)} as assignees`;
      return `${name} updated assignees`;
    }
    case "labels_changed": {
      const p = item.payload;
      const added = resolveLabelNames(p?.addedLabelNames);
      const removed = resolveLabelNames(p?.removedLabelNames);
      if (added.length && removed.length)
        return `${name} added ${joinEnglishList(added)} and removed ${joinEnglishList(removed)}`;
      if (added.length === 1) return `${name} added ${added[0]} label`;
      if (added.length > 1) return `${name} added ${joinEnglishList(added)} labels`;
      if (removed.length === 1) return `${name} removed ${removed[0]} label`;
      if (removed.length > 1) return `${name} removed ${joinEnglishList(removed)} labels`;
      return `${name} updated labels`;
    }
    case "parent_changed": {
      const p = item.payload;
      const prevKey = resolveParentIssueKey(p, "previousParentIssueKey");
      const nextKey = resolveParentIssueKey(p, "newParentIssueKey");
      if (parentWasChanged(p)) {
        if (prevKey && nextKey) {
          return `${name} changed parent issue from ${prevKey} to ${nextKey}`;
        }
        return `${name} changed the parent issue`;
      }
      if (parentWasSet(p)) {
        if (nextKey) return `${name} set parent issue to ${nextKey}`;
        return `${name} set a parent issue`;
      }
      if (parentWasRemoved(p)) {
        if (prevKey) return `${name} removed parent issue (was ${prevKey})`;
        return `${name} removed the parent issue`;
      }
      return `${name} updated parent issue`;
    }
    case "attachment_added":
      return `${name} attached a file`;
    default:
      return `${name} updated this issue`;
  }
}

export function formatIssueActivityWhen(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function resolveIssueActivityActor(
  item: IIssueFeedItem,
  peersById: ReadonlyMap<number, IUser>,
): { name: string; picture: string | null } {
  const normPic = (pic: string | null | undefined) => (pic?.trim() ? pic : null);
  if (item.actor != null) {
    return { name: item.actor.name, picture: normPic(item.actor.picture) };
  }
  const picUser = (u: IUser) => normPic(u.picture);
  if (item.actorId != null) {
    const u = peersById.get(item.actorId);
    if (u) return { name: u.name, picture: picUser(u) };
  }
  return { name: "Someone", picture: null };
}
