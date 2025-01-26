import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/design-system/ui/select";
import type { Meta, StoryObj } from "@storybook/vue3";
import DataList from "./DataList.vue";
import type { ColumnDef } from "@tanstack/vue-table";
import { Icon } from "@/design-system/icons";

const meta = {
  title: "Application/Views/Backlog",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    setup() {
      const columns: ColumnDef<{ id: number; name: string }>[] = [
        {
          accessorKey: "id",
        },
        {
          accessorKey: "name",
        },
        {
          id: "remove",
          header: "Actions",
          cell: () => (
            <div>
              <Icon name="io-trash-bin" class="cursor-pointer text-foreground" />
            </div>
          ),
        },
      ];
      const data = [
        {
          id: 1,
          name: "Mateus Sarmento",
        },
        {
          id: 2,
          name: "Mateus Sarmento",
        },
      ];
      return () => (
        <div class="flex:col-md w-96">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option 1">Option 1</SelectItem>
            </SelectContent>
          </Select>
          <DataList columns={columns} data={data} />
        </div>
      );
    },
  }),
};
