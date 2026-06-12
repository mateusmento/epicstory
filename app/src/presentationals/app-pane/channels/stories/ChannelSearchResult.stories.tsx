import type { IPage } from "@/core/types";
import { StoryContainer } from "@/presentationals/stories/story-container";
import { storyDirectChannel, storyUsers } from "@/presentationals/stories/fixtures";
import type { ISearchChannelsAndUsersItem } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import ChannelSearchResult from "../ChannelSearchResult.vue";

const pageFixture: IPage<ISearchChannelsAndUsersItem> = {
  content: [
    { kind: "channel", channel: { ...storyDirectChannel, id: 9, name: "engineering", directPeer: null } },
    { kind: "channel", channel: { ...storyDirectChannel, id: 10, name: "design", directPeer: null } },
    { kind: "user", user: storyUsers.daiana },
    { kind: "user", user: storyUsers.jean },
  ],
  page: 1,
  count: 20,
  total: 4,
  hasNext: false,
  hasPrevious: false,
};

const meta = {
  title: "Presentational/AppPane/ChannelSearchResult",
  component: ChannelSearchResult,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[420px] h-[520px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof ChannelSearchResult>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ChannelSearchResult },
    setup() {
      const selected = ref("none");
      return { pageFixture, selected };
    },
    template: `
      <ChannelSearchResult
        :page="pageFixture"
        :loading="false"
        @select-channel="selected = 'channel:' + $event"
        @select-user="selected = 'user:' + $event"
      />
      <div class="px-3 py-2 text-xs text-muted-foreground">Selected: {{ selected }}</div>
    `,
  }),
};
