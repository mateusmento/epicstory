import { mergeAttributes, Node, type AnyExtension } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import type { Component } from "vue";
import { TIPTAP_ISSUE_NODE_TYPE } from "../doc/issues-doc";

export type IssueNodeAttrs = {
  issueId: number;
  workspaceId?: number | null;
  projectId?: number | null;
  issueKey?: string | null;
  title?: string | null;
  status?: string | null;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    issue: {
      insertIssue: (attrs: IssueNodeAttrs) => ReturnType;
    };
  }
}

export type CreateIssueExtensionOptions = {
  /** Optional lookup for live badge data in the composer (by issueId). */
  issueById?: (id: number) => IssueNodeAttrs | undefined;
};

/**
 * Inline atom issue badge node + Vue node view (app provides the view component).
 */
export function createIssueExtensionWithNodeView(
  issueNodeView: Component,
  options: CreateIssueExtensionOptions = {},
): AnyExtension {
  return Node.create({
    name: TIPTAP_ISSUE_NODE_TYPE,
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,
    draggable: true,

    addOptions() {
      return {
        issueById: options.issueById,
        HTMLAttributes: {},
      };
    },

    addAttributes() {
      return {
        issueId: {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const raw = element.getAttribute("data-issue-id");
            if (raw == null || raw === "") return null;
            const n = Number(raw);
            return Number.isFinite(n) ? n : null;
          },
          renderHTML: (attributes: { issueId?: number | null }) => {
            if (attributes.issueId == null) return {};
            return { "data-issue-id": String(attributes.issueId) };
          },
        },
        workspaceId: {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const raw = element.getAttribute("data-workspace-id");
            if (raw == null || raw === "") return null;
            const n = Number(raw);
            return Number.isFinite(n) ? n : null;
          },
          renderHTML: (attributes: { workspaceId?: number | null }) => {
            if (attributes.workspaceId == null) return {};
            return { "data-workspace-id": String(attributes.workspaceId) };
          },
        },
        projectId: {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const raw = element.getAttribute("data-project-id");
            if (raw == null || raw === "") return null;
            const n = Number(raw);
            return Number.isFinite(n) ? n : null;
          },
          renderHTML: (attributes: { projectId?: number | null }) => {
            if (attributes.projectId == null) return {};
            return { "data-project-id": String(attributes.projectId) };
          },
        },
        issueKey: {
          default: null,
          parseHTML: (element: HTMLElement) =>
            element.getAttribute("data-issue-key"),
          renderHTML: (attributes: { issueKey?: string | null }) => {
            if (!attributes.issueKey) return {};
            return { "data-issue-key": attributes.issueKey };
          },
        },
        title: {
          default: null,
          parseHTML: (element: HTMLElement) =>
            element.getAttribute("data-title"),
          renderHTML: (attributes: { title?: string | null }) => {
            if (!attributes.title) return {};
            return { "data-title": attributes.title };
          },
        },
        status: {
          default: null,
          parseHTML: (element: HTMLElement) =>
            element.getAttribute("data-status"),
          renderHTML: (attributes: { status?: string | null }) => {
            if (!attributes.status) return {};
            return { "data-status": attributes.status };
          },
        },
      };
    },

    parseHTML() {
      return [{ tag: `span[data-type="${TIPTAP_ISSUE_NODE_TYPE}"]` }];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        "span",
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          "data-type": TIPTAP_ISSUE_NODE_TYPE,
        }),
      ];
    },

    renderText({ node }) {
      const key = node.attrs.issueKey;
      const title = node.attrs.title;
      if (key && title) return `${key} ${title}`;
      if (key) return String(key);
      return `#${node.attrs.issueId ?? ""}`;
    },

    addCommands() {
      return {
        insertIssue:
          (attrs: IssueNodeAttrs) =>
          ({ commands }) =>
            commands.insertContent([
              {
                type: TIPTAP_ISSUE_NODE_TYPE,
                attrs: {
                  issueId: attrs.issueId,
                  workspaceId: attrs.workspaceId ?? null,
                  projectId: attrs.projectId ?? null,
                  issueKey: attrs.issueKey ?? null,
                  title: attrs.title ?? null,
                  status: attrs.status ?? null,
                },
              },
              { type: "text", text: " " },
            ]),
      };
    },

    addNodeView() {
      return VueNodeViewRenderer(issueNodeView);
    },
  });
}
