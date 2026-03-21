import type { Meta, StoryObj } from "@storybook/vue3";
import { Code2Icon, PlusIcon, TrashIcon } from "lucide-vue-next";
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from ".";
import { StoryContainer } from "@/components/app-pane/channel/story-container";
import { h } from "vue";
import { Button } from "../button";

const meta = {
  title: "Design System/Menu",
  component: Menu,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      grid: {
        cellSize: 20,
        opacity: 0.5,
        cellAmount: 5,
        offsetX: 16, // Default is 0 if story has 'fullscreen' layout, 16 if layout is 'padded'
        offsetY: 16, // Default is 0 if story has 'fullscreen' layout, 16 if layout is 'padded'
      },
    },
  },
  decorators: [
    (story) => ({
      render: () => <StoryContainer class="w-fit">{h(story())}</StoryContainer>,
    }),
  ],
} satisfies Meta<typeof Menu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: {
      Menu,
      MenuCheckboxItem,
      MenuContent,
      MenuItem,
      MenuLabel,
      MenuRadioGroup,
      MenuRadioItem,
      MenuSeparator,
      MenuShortcut,
      MenuSub,
      MenuSubContent,
      MenuSubTrigger,
      MenuTrigger,
      Code2Icon,
      PlusIcon,
      TrashIcon,
    },
    template: `
      <Menu type="context-menu">
        <MenuTrigger class="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
          Right click here
        </MenuTrigger>
        <MenuContent class="w-52">
          <MenuItem inset>
            Back
            <MenuShortcut>⌘[</MenuShortcut>
          </MenuItem>
          <MenuItem inset disabled>
            Forward
            <MenuShortcut>⌘]</MenuShortcut>
          </MenuItem>
          <MenuItem inset>
            Reload
            <MenuShortcut>⌘R</MenuShortcut>
          </MenuItem>
          <MenuSub>
            <MenuSubTrigger inset>
              More Tools
            </MenuSubTrigger>
            <MenuSubContent class="w-44">
              <MenuItem inset>
                Save Page...
                <MenuShortcut>⇧⌘S</MenuShortcut>
              </MenuItem>
              <MenuItem>
                <PlusIcon class="size-4"/>
                Create Shortcut...
              </MenuItem>
              <MenuItem inset>
                Name Window...
              </MenuItem>
              <MenuSeparator />
              <MenuItem>
                <Code2Icon />
                Developer Tools
              </MenuItem>
              <MenuSeparator />
              <MenuItem variant="destructive">
                <TrashIcon />
                Delete
              </MenuItem>
            </MenuSubContent>
          </MenuSub>
          <MenuSeparator />
          <MenuCheckboxItem :model-value="true">
            Show Bookmarks
            <MenuShortcut>⌘⇧B</MenuShortcut>
          </MenuCheckboxItem>
          <MenuCheckboxItem>Show Full URLs</MenuCheckboxItem>
          <MenuSeparator />
          <MenuRadioGroup model-value="pedro">
            <MenuLabel inset>
              People
            </MenuLabel>
            <MenuRadioItem value="pedro">
              Pedro Duarte
            </MenuRadioItem>
            <MenuRadioItem value="colm">
              Colm Tuite
            </MenuRadioItem>
          </MenuRadioGroup>
        </MenuContent>
      </Menu>
    `,
  }),
};

export const DropdownMenu: Story = {
  render: () => ({
    components: {
      Button,
      Menu,
      MenuContent,
      MenuGroup,
      MenuItem,
      MenuLabel,
      MenuSeparator,
      MenuShortcut,
      MenuSub,
      MenuSubContent,
      MenuSubTrigger,
      MenuTrigger,
    },
    template: `
      <Menu type="dropdown-menu">
        <MenuTrigger as-child>
          <Button variant="outline">
            Open
          </Button>
        </MenuTrigger>
        <MenuContent class="w-56" align="start">
          <MenuLabel>My Account</MenuLabel>
          <MenuGroup>
            <MenuItem>
              Profile
              <MenuShortcut>⇧⌘P</MenuShortcut>
            </MenuItem>
            <MenuItem>
              Billing
              <MenuShortcut>⌘B</MenuShortcut>
            </MenuItem>
            <MenuItem>
              Settings
              <MenuShortcut>⌘S</MenuShortcut>
            </MenuItem>
            <MenuItem>
              Keyboard shortcuts
              <MenuShortcut>⌘K</MenuShortcut>
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuItem>Team</MenuItem>
            <MenuSub>
              <MenuSubTrigger>Invite users</MenuSubTrigger>
              <MenuSubContent>
                <MenuItem>Email</MenuItem>
                <MenuItem>Message</MenuItem>
                <MenuSeparator />
                <MenuItem>More...</MenuItem>
              </MenuSubContent>
            </MenuSub>
            <MenuItem>
              New Team
              <MenuShortcut>⌘+T</MenuShortcut>
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuItem>GitHub</MenuItem>
          <MenuItem>Support</MenuItem>
          <MenuItem disabled>
            API
          </MenuItem>
          <MenuSeparator />
          <MenuItem>
            Log out
            <MenuShortcut>⇧⌘Q</MenuShortcut>
          </MenuItem>
        </MenuContent>
      </Menu>
    `,
  }),
};
