import type { IMessage, IReply } from "@epicstory/contracts";
import type { IMessageAttachment } from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import { computed, ref } from "vue";

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

  const editing = ref<{
    entity: IMessage | IReply;
    id: number;
    content: JSONContent;
    attachments: IMessageAttachment[];
  } | null>(null);

  const editingMessagePayload = computed(() =>
    editing.value
      ? {
          id: editing.value.id,
          content: editing.value.content,
          attachments: editing.value.attachments,
        }
      : null,
  );

  function startEdit(entity: IMessage | IReply) {
    editing.value = {
      entity,
      id: entity.id,
      content: entity.content as JSONContent,
      attachments: [...(entity.attachments ?? [])],
    };
  }

  function cancelEdit() {
    editing.value = null;
  }

  async function submitEdit(value: { messageId: number; content: JSONContent; attachmentIds?: number[] }) {
    if (!editing.value) return;
    await updateIssueComment(editing.value.entity, value.content, value.attachmentIds);
    editing.value = null;
    await onAfterSave();
  }

  function clearIfEditingEntity(entityId: number) {
    if (editing.value?.id === entityId) editing.value = null;
  }

  return {
    editing,
    editingMessagePayload,
    startEdit,
    cancelEdit,
    submitEdit,
    clearIfEditingEntity,
  };
}
