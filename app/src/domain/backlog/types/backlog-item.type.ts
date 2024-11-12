import type { Issue } from "@/domain/issues";

export type BacklogItem = {
  id: number;
  issue: Issue;
  order: number;
  previousId: number;
  nextId: number;
};
