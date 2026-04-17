const EPIC_STORY_TASK_LIST_CLASSES =
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:ml-0 [&_ul[data-type=taskList]]:pl-0 [&_ul[data-type=taskList]]:my-1 " +
  "[&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:gap-2 [&_li[data-type=taskItem]]:items-start [&_li[data-type=taskItem]]:my-0.5 " +
  "[&_li[data-type=taskItem]_label]:shrink-0 [&_li[data-type=taskItem]_label]:pt-0.5";

const EPIC_STORY_TABLE_CLASSES =
  "[&_.tableWrapper]:my-2 [&_.tableWrapper]:overflow-x-auto [&_table]:w-full [&_table]:min-w-[12rem] [&_table]:border-collapse [&_table]:text-sm " +
  "[&_td]:border [&_td]:border-zinc-200/90 [&_td]:align-top [&_td]:p-2 [&_th]:border [&_th]:border-zinc-200/90 [&_th]:align-top [&_th]:p-2 [&_th]:bg-muted/40";

const EPIC_STORY_IMAGE_CLASSES = "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-2";

/** Channel / issue composer surface (editable). */
export const EPIC_STORY_COMPOSER_EDITOR_CLASS =
  "min-h-[3rem] outline-none text-sm leading-relaxed focus:outline-none [&_p]:my-1 [&_li>p]:my-0 [&_ul]:list-disc " +
  "[&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_a]:text-blue-600 [&_a]:underline " +
  "[&_blockquote]:text-muted-foreground/90 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/25 " +
  "[&_blockquote]:pl-3 [&_blockquote]:py-0.5 [&_blockquote]:my-1 [&_blockquote]:bg-muted/30 [&_blockquote]:rounded-r-md " +
  "[&_pre:not(.epic-code-card-pre)]:my-2 [&_pre:not(.epic-code-card-pre)]:rounded-md [&_pre:not(.epic-code-card-pre)]:bg-zinc-900/90 [&_pre:not(.epic-code-card-pre)]:p-3 [&_pre:not(.epic-code-card-pre)]:overflow-x-auto [&_pre:not(.epic-code-card-pre)]:text-left " +
  "[&_pre:not(.epic-code-card-pre)_code]:font-mono [&_pre:not(.epic-code-card-pre)_code]:text-[0.8125rem] [&_pre:not(.epic-code-card-pre)_code]:text-zinc-100 " +
  "[&_pre:not(.epic-code-card-pre)_code.hljs]:bg-transparent " +
  "[&_p_code]:font-mono [&_p_code]:text-[0.8125rem] [&_p_code]:bg-zinc-100 [&_p_code]:text-zinc-900 [&_p_code]:rounded " +
  "[&_p_code]:px-1 [&_p_code]:py-px " +
  EPIC_STORY_TASK_LIST_CLASSES +
  " " +
  EPIC_STORY_TABLE_CLASSES +
  " " +
  EPIC_STORY_IMAGE_CLASSES;

/** Read-only rendered channel message (matches prior RichMessageContent styling intent). */
export const EPIC_STORY_READONLY_MESSAGE_CLASS =
  "outline-none text-[calc(1rem-1px)] font-lato leading-relaxed [&_p]:my-1 [&_li>p]:my-0 [&_ul]:list-disc " +
  "[&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:text-muted-foreground/90 " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/20 [&_blockquote]:pl-3 [&_blockquote]:py-0.5 [&_blockquote]:my-1 " +
  "[&_blockquote]:bg-muted/30 [&_blockquote]:rounded-r-md [&_pre:not(.epic-code-card-pre)]:my-2 [&_pre:not(.epic-code-card-pre)]:rounded-md [&_pre:not(.epic-code-card-pre)]:bg-muted [&_pre:not(.epic-code-card-pre)]:p-3 [&_pre:not(.epic-code-card-pre)]:overflow-x-auto " +
  "[&_pre:not(.epic-code-card-pre)]:text-left [&_pre:not(.epic-code-card-pre)_code]:font-mono [&_pre:not(.epic-code-card-pre)_code]:text-[0.8125rem] [&_pre:not(.epic-code-card-pre)_code]:text-foreground " +
  "[&_pre:not(.epic-code-card-pre)_code.hljs]:bg-transparent " +
  EPIC_STORY_TASK_LIST_CLASSES +
  " " +
  EPIC_STORY_TABLE_CLASSES +
  " " +
  EPIC_STORY_IMAGE_CLASSES;

/** Issue description editor when editing (issue-specific spacing). */
export const EPIC_STORY_ISSUE_DESCRIPTION_EDITOR_CLASS =
  "min-h-28 outline-none text-sm leading-relaxed focus:outline-none [&_p]:my-2 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 " +
  "[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-secondary-foreground " +
  "[&_pre:not(.epic-code-card-pre)]:my-2 [&_pre:not(.epic-code-card-pre)]:rounded-md [&_pre:not(.epic-code-card-pre)]:bg-zinc-900/90 [&_pre:not(.epic-code-card-pre)]:p-3 [&_pre:not(.epic-code-card-pre)]:overflow-x-auto [&_pre:not(.epic-code-card-pre)]:text-left " +
  "[&_pre:not(.epic-code-card-pre)_code]:font-mono [&_pre:not(.epic-code-card-pre)_code]:text-[0.8125rem] [&_pre:not(.epic-code-card-pre)_code]:text-zinc-100 " +
  "[&_pre:not(.epic-code-card-pre)_code.hljs]:bg-transparent " +
  "[&_p_code]:font-mono [&_p_code]:text-[0.8125rem] [&_p_code]:bg-zinc-100 [&_p_code]:text-zinc-900 [&_p_code]:rounded " +
  "[&_p_code]:px-1 [&_p_code]:py-px " +
  EPIC_STORY_TASK_LIST_CLASSES +
  " " +
  EPIC_STORY_TABLE_CLASSES +
  " " +
  EPIC_STORY_IMAGE_CLASSES;
