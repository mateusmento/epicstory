import { DropdownMenuPanel } from "@/presentationals/stories/harness/DropdownMenuPanel";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import IssueStatusMenu from "../status/IssueStatusMenu.vue";

const meta = {
  title: "Presentational/Issue/IssueStatusMenu",
  component: IssueStatusMenu,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[280px] p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueStatusMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueStatusMenu, DropdownMenuPanel },
    setup() {
      const selected = ref("doing");
      return { selected };
    },
    template: `
      <div class="flex flex-col gap-2">
        <DropdownMenuPanel content-class="w-[280px]">
          <IssueStatusMenu :value="selected" @select="selected = $event" />
        </DropdownMenuPanel>
        <div class="text-xs text-muted-foreground">Selected status: {{ selected }}</div>
      </div>
    `,
  }),
};
