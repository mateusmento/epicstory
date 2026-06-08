import { normalizeTiptapDoc } from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import type { Ref } from "vue";
import { watch } from "vue";
import type { ReadonlyRefOrGetter } from "@/utils";
import { toValue } from "@/utils";

type EditingMessage = {
  id: number;
  content: JSONContent;
} | null;

export function useMessageComposerEditingBody(options: {
  editor: Ref<Editor | null>;
  editingMessage: ReadonlyRefOrGetter<EditingMessage>;
}) {
  watch(
    [options.editor, () => toValue(options.editingMessage)],
    async ([editor, msg], [prevEditor, prevMsg]) => {
      if (!editor) return;
      if (!msg) {
        editor.commands.clearContent();
        return;
      }
      if (prevMsg?.id === msg.id && prevEditor === editor) return;
      const doc = normalizeTiptapDoc(msg.content);
      editor.commands.setContent(doc);
      editor.commands.focus("end");
    },
    { flush: "post", immediate: true },
  );
}
