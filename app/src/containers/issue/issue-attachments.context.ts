import type { useIssueAttachments } from "@/domain/issues";
import { inject, provide, type InjectionKey } from "vue";

export type IssueAttachmentsContext = ReturnType<typeof useIssueAttachments>;

const KEY: InjectionKey<IssueAttachmentsContext> = Symbol("IssueAttachmentsContext");

export function provideIssueAttachmentsContext(ctx: IssueAttachmentsContext) {
  provide(KEY, ctx);
}

export function useIssueAttachmentsContext(): IssueAttachmentsContext {
  const ctx = inject(KEY, null);
  if (!ctx) {
    throw new Error("IssueAttachmentsContext is not provided");
  }
  return ctx;
}
