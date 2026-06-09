import type { IMessage, IReply, UpdateChannelMessageBody } from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import { ref } from "vue";

type UpdateIssueCommentFn = (
  entity: IMessage | IReply,
  content: JSONContent,
  attachmentIds?: number[],
) => Promise<unknown>;

export function useIssueCommentEditing(options: {
  updateIssueComment: UpdateIssueCommentFn;
  onAfterSave: () => Promise<void>;
}) {
  const { updateIssueComment, onAfterSave } = options;

  const editing = ref<(IMessage | IReply) | null>(null);

  function startEdit(entity: IMessage | IReply) {
    editing.value = entity;
  }

  function cancelEdit() {
    editing.value = null;
  }

  async function submitEdit(value: UpdateChannelMessageBody) {
    if (!editing.value) return;
    await updateIssueComment(editing.value, value.content, value.attachmentIds);
    editing.value = null;
    await onAfterSave();
  }

  function clearIfEditingEntity(entityId: number) {
    if (editing.value?.id === entityId) editing.value = null;
  }

  return {
    editing,
    startEdit,
    cancelEdit,
    submitEdit,
    clearIfEditingEntity,
  };
}

export type IssueCommentEditing = ReturnType<typeof useIssueCommentEditing>;
