import { StoryContainer } from "@/presentationals/stories/story-container";
import { storyUsers } from "@/presentationals/stories/fixtures";
import type { JSONContent } from "@tiptap/core";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h } from "vue";
import RichTextPreview from "../RichTextPreview.vue";
import MarkedSegment from "../segments/MarkedSegment.vue";
import InlineFragments from "../segments/InlineFragments.vue";
import MentionChip from "../segments/MentionChip.vue";
import MentionHoverCard from "../segments/MentionHoverCard.vue";
import CodeBlockCard from "../segments/CodeBlockCard.vue";

const doc: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Hello " },
        { type: "mention", attrs: { id: storyUsers.daiana.id, label: storyUsers.daiana.name } },
        { type: "text", text: ", review this snippet:" },
      ],
    },
    {
      type: "codeBlock",
      attrs: { language: "ts" },
      content: [{ type: "text", text: "const greeting = 'hi';\nconsole.log(greeting);" }],
    },
  ],
};

const mentionables = [storyUsers.sean, storyUsers.daiana, storyUsers.jean];

const meta = {
  title: "Presentational/RichText/RichTextPreview",
  component: RichTextPreview,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[760px] h-[560px] p-6">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof RichTextPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: doc,
    mentionedUsers: mentionables,
    meId: storyUsers.sean.id,
  },
};

export const MarkedSegmentTierB: Story = {
  render: () => ({
    components: { MarkedSegment },
    template: `
      <MarkedSegment
        text="Bold linked text"
        :marks="[
          { type: 'bold' },
          { type: 'link', attrs: { href: 'https://example.com' } }
        ]"
      />
    `,
  }),
};

export const InlineFragmentsTierB: Story = {
  render: () => ({
    components: { InlineFragments },
    setup() {
      const byId = new Map(mentionables.map((user) => [user.id, user]));
      return {
        nodes: [
          { type: "text", text: "Assigned to " },
          { type: "mention", attrs: { id: storyUsers.daiana.id, label: storyUsers.daiana.name } },
          { type: "text", text: " today." },
        ],
        userById: (id: number) => byId.get(id),
      };
    },
    template: `
      <InlineFragments
        :nodes="nodes"
        :mention-me-id="${storyUsers.sean.id}"
        :user-by-id="userById"
        :issue-by-id="() => undefined"
      />
    `,
  }),
};

export const MentionChipTierB: Story = {
  render: () => ({
    components: { MentionChip },
    setup() {
      const byId = new Map(
        mentionables.map((user) => [user.id, user]),
      );
      return { byId };
    },
    template: `
      <MentionChip
        :attrs="{ id: ${storyUsers.daiana.id}, label: '${storyUsers.daiana.name}' }"
        :mention-me-id="${storyUsers.sean.id}"
        :user-by-id="(id) => byId.get(id)"
      />
    `,
  }),
};

export const MentionHoverCardTierB: Story = {
  render: () => ({
    components: { MentionHoverCard },
    template: `
      <MentionHoverCard :user="undefined" raw="@99">
        <span class="underline decoration-dashed cursor-help text-sm">Hover unknown mention</span>
      </MentionHoverCard>
    `,
  }),
};

export const CodeBlockCardTierB: Story = {
  render: () => ({
    components: { CodeBlockCard },
    setup() {
      return {
        previewNode: {
          type: "codeBlock",
          attrs: { language: "ts" },
          content: [{ type: "text", text: "export const sum = (a: number, b: number) => a + b;" }],
        } as JSONContent,
      };
    },
    template: `<CodeBlockCard variant="preview" :preview-node="previewNode" />`,
  }),
};
