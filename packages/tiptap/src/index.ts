export type { RichTextDocument, TiptapJSONNode } from "./doc/types";
export { EMPTY_RICH_TEXT_DOCUMENT } from "./doc/types";
export { normalizeTiptapDoc } from "./doc/normalize";
export {
  tiptapToPlainText,
  type TiptapToPlainTextOptions,
} from "./doc/plain-text";
export { extractMentionIdsFromDoc } from "./doc/mentions-doc";
export { messageBodyPlainText, mergeQuotedMessageIntoDoc } from "./doc/message";
export { collectImageAttachmentIdsFromDoc } from "./doc/collect-image-attachment-ids";
export { stripImageNodesFromDoc } from "./doc/strip-image-nodes";
export {
  isRichTextEqual,
  serializeRichTextForCompare,
} from "./doc/compare";
export { legacyPlainTextToRichTextDocument } from "./doc/legacy-plain";
export { richTextDocumentToHtml } from "./doc/generate-html";
