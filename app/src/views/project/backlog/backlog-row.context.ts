import type { Issue } from "@/domain/issues";
import { inject, provide, type InjectionKey } from "vue";

export type BacklogEditingState = {
  id: number | null;
  title: string;
};

export type BacklogRowContext = {
  workspaceId: number;
  gridColsClass: string;
  editing: BacklogEditingState;

  openIssue(issue: Issue): void;
  startEdit(issue: Issue): void;
  cancelEdit(): void;
  saveEdit(): void;

  updateIssueStatus(issue: Issue, status: string): void;
  statusDotClass(status: string): string;

  onLabelsChange(issue: Issue, nextIds: number[]): void | Promise<void>;
};

const KEY: InjectionKey<BacklogRowContext> = Symbol("BacklogRowContext");

export function provideBacklogRowContext(ctx: BacklogRowContext) {
  provide(KEY, ctx);
}

export function useBacklogRowContext() {
  const ctx = inject(KEY, null);
  if (!ctx) throw new Error("BacklogRowContext is not provided");
  return ctx;
}
