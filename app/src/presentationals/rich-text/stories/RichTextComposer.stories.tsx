import { toPaginatedListView } from "@/lib/async";
import { StoryContainer } from "@/presentationals/stories/story-container";
import { storyUsers } from "@/presentationals/stories/fixtures";
import type { MentionComposerView } from "@/presentationals/rich-text/mention.types";
import type { MentionSuggestionItem } from "@/presentationals/rich-text/mention-suggestion.types";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import RichTextComposer from "../RichTextComposer.vue";
import MentionNodeView from "../node-views/MentionNodeView.vue";
import MentionList from "../node-views/MentionList.vue";
import CodeBlockCardNodeView from "../node-views/CodeBlockCardNodeView.vue";

const mentionables = [storyUsers.sean, storyUsers.daiana, storyUsers.jean];

const mentionView: MentionComposerView = {
  mentionables,
  list: toPaginatedListView({ items: mentionables, loading: false, loadingMore: false, hasMore: false }),
  onlineUserIds: new Set([storyUsers.daiana.id]),
};

const meta = {
  title: "Presentational/RichText/RichTextComposer",
  component: RichTextComposer,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[760px] h-[560px] p-6">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof RichTextComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    mention: mentionView,
    meId: storyUsers.sean.id,
    placeholder: "Write a comment...",
  },
};

export const MentionNodeViewTierB: Story = {
  render: () => ({
    components: { MentionNodeView },
    setup() {
      return {
        props: {
          node: { attrs: { id: storyUsers.daiana.id, label: storyUsers.daiana.name } },
          extension: {
            options: {
              mentionContext: { meId: storyUsers.sean.id },
              userById: (id: number) => mentionables.find((u) => u.id === id),
            },
          },
        },
      };
    },
    template: `<MentionNodeView v-bind="props" />`,
  }),
};

export const MentionListTierB: Story = {
  render: () => ({
    components: { MentionList },
    setup() {
      const items: MentionSuggestionItem[] = mentionables.map((user) => ({
        id: user.id,
        label: user.name,
        picture: user.picture,
      }));
      const selected = ref<number | null>(null);
      return { items, selected };
    },
    template: `
      <MentionList
        :items="items"
        :command="(item) => selected = item.id"
        :online-user-ids="new Set([${storyUsers.daiana.id}])"
      />
      <div class="mt-2 text-xs text-muted-foreground">Selected: {{ selected ?? 'none' }}</div>
    `,
  }),
};

export const CodeBlockCardNodeViewTierB: Story = {
  render: () => ({
    components: { CodeBlockCardNodeView },
    setup() {
      return {
        props: {
          node: {
            attrs: { language: "ts" },
            textContent: "const x = 1;\nconsole.log(x);",
          },
          editor: { isEditable: true },
          updateAttributes: () => {},
        },
      };
    },
    template: `<CodeBlockCardNodeView v-bind="props" />`,
  }),
};
