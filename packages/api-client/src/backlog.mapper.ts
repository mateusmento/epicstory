import type { IBacklogItem, Page } from "@epicstory/contracts";
import { mapIssue, type IIssueWire } from "./issue.mapper";

/** Wire backlog rows before nested issue dates are normalized. */
export type IBacklogItemWire = Omit<IBacklogItem, "issue"> & {
  issue: IIssueWire;
};

export function mapBacklogItem(item: IBacklogItemWire): IBacklogItem {
  return { ...item, issue: mapIssue(item.issue) };
}

export function mapPageBacklogItems(
  page: Page<IBacklogItemWire>,
): Page<IBacklogItem> {
  return { ...page, content: page.content.map(mapBacklogItem) };
}
