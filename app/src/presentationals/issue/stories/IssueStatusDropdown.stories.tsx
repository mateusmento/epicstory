import type { Meta, StoryObj } from "@storybook/vue3";
import { Button } from "@/design-system";
import { ref } from "vue";
import IssueStatusDropdown from "../status/IssueStatusDropdown.vue";

const meta = {
  title: "Presentational/Issue/IssueStatusDropdown",
  component: IssueStatusDropdown,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueStatusDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueStatusDropdown, Button },
    setup() {
      const value = ref("todo");
      return { value };
    },
    template: `
      <div class="flex flex-col gap-2">
        <IssueStatusDropdown :value="value" @select="value = $event">
          <Button type="button" variant="outline" size="sm">Status: {{ value }}</Button>
        </IssueStatusDropdown>
        <div class="text-xs text-muted-foreground">Current status: {{ value }}</div>
      </div>
    `,
  }),
};
