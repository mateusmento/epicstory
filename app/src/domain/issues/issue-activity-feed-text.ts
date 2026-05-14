import type { IUser as IUser } from "@epicstory/contracts";
import type { IssueFeedItem } from "./types";
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

function readPayload(item: IssueFeedItem): Record<string, unknown> | null {
  const raw = item.payload;
  if (raw == null || typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
}

function joinEnglishList(parts: string[]): string {
  const xs = parts.filter((s) => s.trim() !== "");
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

function resolveAddedAssigneeNames(
  p: Record<string, unknown> | null,
  peersById: ReadonlyMap<number, IUser>,
): string[] {
  if (!p) return [];
  const fromPayload = (p.addedUserNames as unknown[] | undefined)?.filter(
    (x): x is string => typeof x === "string" && x.trim() !== "",
  );
  if (fromPayload?.length) return fromPayload;
  const ids = (p.addedUserIds as unknown[] | undefined)?.filter((x): x is number => typeof x === "number");
  if (!ids?.length) return [];
  return ids
    .map((id) => peersById.get(id)?.name)
    .filter((n): n is string => typeof n === "string" && n !== "");
}

function resolveRemovedAssigneeNames(
  p: Record<string, unknown> | null,
  peersById: ReadonlyMap<number, IUser>,
): string[] {
  if (!p) return [];
  const fromPayload = (p.removedUserNames as unknown[] | undefined)?.filter(
    (x): x is string => typeof x === "string" && x.trim() !== "",
  );
  if (fromPayload?.length) return fromPayload;
  const ids = (p.removedUserIds as unknown[] | undefined)?.filter((x): x is number => typeof x === "number");
  if (!ids?.length) return [];
  return ids
    .map((id) => peersById.get(id)?.name)
    .filter((n): n is string => typeof n === "string" && n !== "");
}

function resolveLabelNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim() !== "");
}

/** One plain sentence: "Ada changed status to Done", "Harry added Feature label". */
export function formatIssueActivitySentence(
  item: IssueFeedItem,
  peersById: ReadonlyMap<number, IUser>,
): string {
  const actor = resolveIssueActivityActor(item, peersById);
  const name = actor.name;
  const p = readPayload(item);

  switch (item.type) {
    case "issue_created":
      return `${name} created this issue`;
    case "comment_created":
      return `${name} posted a comment`;
    case "title_changed": {
      const nextRaw = p?.newTitle;
      const prevRaw = p?.previousTitle;
      const next = typeof nextRaw === "string" ? nextRaw : null;
      const prev = typeof prevRaw === "string" ? prevRaw : null;
      if (next && prev && next !== prev) return `${name} changed title from “${prev}” to “${next}”`;
      if (next) return `${name} changed title to “${next}”`;
      return `${name} changed the title`;
    }
    case "description_changed": {
      if (p?.changeKind === "cleared") return `${name} cleared the description`;
      const ex = typeof p?.excerpt === "string" ? p.excerpt.trim() : "";
      if (ex) return `${name} updated the description — ${ex.length > 160 ? `${ex.slice(0, 160)}…` : ex}`;
      return `${name} updated the description`;
    }
    case "status_changed": {
      const next = formatStatusKey(typeof p?.newStatus === "string" ? p.newStatus : null);
      if (next) return `${name} changed status to ${next}`;
      return `${name} changed status`;
    }
    case "priority_changed": {
      const next = typeof p?.newPriority === "number" ? formatPriorityValue(p.newPriority) : null;
      if (next) return `${name} changed priority to ${next}`;
      return `${name} changed priority`;
    }
    case "due_date_changed": {
      const prev = formatDueIso(typeof p?.previousDueDate === "string" ? p.previousDueDate : null);
      const next = formatDueIso(typeof p?.newDueDate === "string" ? p.newDueDate : null);
      if (next && prev && prev !== next) return `${name} changed due date to ${next}`;
      if (next && !prev) return `${name} set due date to ${next}`;
      if (!next && prev) return `${name} removed the due date`;
      return `${name} updated the due date`;
    }
    case "assignees_changed": {
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
      const prevRaw = p?.previousParentIssueId;
      const nextRaw = p?.newParentIssueId;
      const prev = typeof prevRaw === "number" ? prevRaw : null;
      const next = typeof nextRaw === "number" ? nextRaw : null;
      if (next != null && prev != null && prev !== next)
        return `${name} changed parent issue from #${prev} to #${next}`;
      if (next != null) return `${name} set parent issue to #${next}`;
      if (prev != null) return `${name} removed parent issue (was #${prev})`;
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
  item: IssueFeedItem,
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
