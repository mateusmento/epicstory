/** Channel / issue composer surface (editable). */
export const EPIC_STORY_COMPOSER_EDITOR_CLASS =
  "min-h-[3rem] outline-none text-sm leading-relaxed focus:outline-none [&_p]:my-1 [&_li>p]:my-0 [&_ul]:list-disc " +
  "[&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_a]:text-blue-600 [&_a]:underline [&_pre]:my-2 [&_pre]:rounded-md " +
  "[&_pre]:bg-zinc-900/90 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:text-left [&_code]:font-mono [&_code]:text-[0.8125rem] " +
  "[&_code]:text-zinc-100";

/** Read-only rendered channel message (matches prior RichMessageContent styling intent). */
export const EPIC_STORY_READONLY_MESSAGE_CLASS =
  "outline-none text-[calc(1rem-1px)] font-lato leading-relaxed [&_p]:my-1 [&_li>p]:my-0 [&_ul]:list-disc " +
  "[&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:text-muted-foreground/90 " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/20 [&_blockquote]:pl-3 [&_blockquote]:py-0.5 [&_blockquote]:my-1 " +
  "[&_blockquote]:bg-muted/30 [&_blockquote]:rounded-r-md [&_pre]:my-2 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:overflow-x-auto " +
  "[&_pre]:text-left [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-foreground";

/** Issue description editor when editing (issue-specific spacing). */
export const EPIC_STORY_ISSUE_DESCRIPTION_EDITOR_CLASS =
  "min-h-28 outline-none text-sm leading-relaxed focus:outline-none [&_p]:my-2 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 " +
  "[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-secondary-foreground " +
  "[&_pre]:my-2 [&_pre]:rounded-md [&_pre]:bg-zinc-900/90 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:text-left " +
  "[&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-zinc-100";
