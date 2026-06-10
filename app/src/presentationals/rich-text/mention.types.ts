import type { PaginatedListView } from "@/lib/async";
import type { IUser } from "@epicstory/contracts";

export type MentionComposerView = {
  mentionables: IUser[];
  list: PaginatedListView<IUser>;
  /** Precomputed in container/view; no predicate props in presentationals */
  onlineUserIds?: ReadonlySet<number>;
};
