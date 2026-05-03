/**
 * Unified rich-text root class (composer, preview HTML wrapper, issue editor).
 * Styles live in `./editor.css` using Tailwind `@apply`. Import `@epicstory/tiptap/vue/editor.css` in the app.
 */
export const EPICSTORY_RICH_TEXT = "epicstory-rich-text";

/** Editable ProseMirror surface (channel composer). */
export const EPICSTORY_RICH_TEXT_EDITABLE = `${EPICSTORY_RICH_TEXT} epicstory-rich-text--editable`;

/** Issue description editor (extra spacing / min-height via `--issue` in CSS). */
export const EPICSTORY_RICH_TEXT_ISSUE = `${EPICSTORY_RICH_TEXT_EDITABLE} epicstory-rich-text--issue`;

/** Read-only HTML preview (`generateHTML` + `v-html`). */
export const EPICSTORY_RICH_TEXT_PREVIEW = `${EPICSTORY_RICH_TEXT} epicstory-rich-text--preview`;
