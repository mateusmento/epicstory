import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/design-system";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";

const meta = {
  title: "Design System/Dialog",
  tags: ["autodocs"],
  component: Dialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithTrigger: Story = {
  render: () => ({
    components: {
      Button,
      Dialog,
      DialogContent,
      DialogDescription,
      DialogFooter,
      DialogHeader,
      DialogTitle,
      DialogTrigger,
    },
    template: `
      <Dialog>
        <DialogTrigger as-child>
          <Button variant="outline">Open dialog</Button>
        </DialogTrigger>
        <DialogContent class="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Make changes to your profile here. Click save when done.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    `,
  }),
};

export const Open: Story = {
  render: () => ({
    components: {
      Button,
      Dialog,
      DialogContent,
      DialogDescription,
      DialogFooter,
      DialogHeader,
      DialogTitle,
    },
    setup() {
      const open = ref(true);
      return { open };
    },
    template: `
      <Dialog v-model:open="open">
        <DialogContent class="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect integration</DialogTitle>
            <DialogDescription>Review settings before connecting your workspace.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="surface" color="secondary" @click="open = false">Cancel</Button>
            <Button variant="brand" color="primary" @click="open = false">Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    `,
  }),
};

/** Destructive confirm pattern — aligns with ConfirmDialog presentational */
export const DestructiveConfirm: Story = {
  render: () => ({
    components: {
      Button,
      Dialog,
      DialogContent,
      DialogDescription,
      DialogFooter,
      DialogHeader,
      DialogTitle,
    },
    setup() {
      const open = ref(true);
      return { open };
    },
    template: `
      <Dialog v-model:open="open">
        <DialogContent class="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete issue?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The issue and its activity will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="mt-2">
            <Button variant="outline" @click="open = false">Cancel</Button>
            <Button variant="brand" color="destructive" @click="open = false">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    `,
  }),
};
