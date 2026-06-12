import { Dialog, DialogContent } from "@/design-system";
import ConfirmDialog from "../ConfirmDialog.vue";
import ConfirmDialogProvider from "../ConfirmDialogProvider.vue";
import { CONFIRM_DIALOG_KEY } from "../confirm-dialog";
import type { Meta, StoryObj } from "@storybook/vue3";
import { Button } from "@/design-system";
import { inject, ref } from "vue";

const meta = {
  title: "Presentational/ConfirmDialog/ConfirmDialog",
  component: ConfirmDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Destructive: Story = {
  render: () => ({
    components: { ConfirmDialog, Dialog, DialogContent },
    setup() {
      const open = ref(true);
      const result = ref<string | null>(null);
      return {
        open,
        result,
        onConfirm: () => {
          result.value = "confirmed";
          open.value = false;
        },
        onCancel: () => {
          result.value = "cancelled";
          open.value = false;
        },
      };
    },
    template: `
      <div class="flex flex-col items-center gap-2">
        <Dialog :open="open" @update:open="open = $event">
          <DialogContent class="max-w-md">
            <ConfirmDialog
              title="Delete channel?"
              description="This cannot be undone. Messages will be permanently removed."
              confirm-label="Delete"
              cancel-label="Cancel"
              :destructive="true"
              @confirm="onConfirm"
              @cancel="onCancel"
            />
          </DialogContent>
        </Dialog>
        <span v-if="result" class="text-xs text-muted-foreground">Result: {{ result }}</span>
        <Button v-if="!open" size="sm" @click="open = true; result = null">Reopen</Button>
      </div>
    `,
  }),
};

export const WithProvider: Story = {
  render: () => ({
    components: { ConfirmDialogProvider, Button },
    setup() {
      const lastResult = ref<string | null>(null);

      const TriggerButton = {
        setup() {
          const confirm = inject(CONFIRM_DIALOG_KEY)!;
          async function ask() {
            const ok = await confirm.open({
              title: "Archive issue?",
              description: "The issue will move to the archive.",
              confirmLabel: "Archive",
              cancelLabel: "Keep",
            });
            lastResult.value = ok ? "confirmed" : "cancelled";
          }
          return { ask };
        },
        template: `<Button @click="ask">Open confirm dialog</Button>`,
      };

      return { TriggerButton, lastResult };
    },
    template: `
      <ConfirmDialogProvider>
        <div class="flex flex-col items-center gap-2 p-4">
          <TriggerButton />
          <span v-if="lastResult" class="text-xs text-muted-foreground">Result: {{ lastResult }}</span>
        </div>
      </ConfirmDialogProvider>
    `,
  }),
};

export const DefaultConfirm: Story = {
  render: () => ({
    components: { ConfirmDialog, Dialog, DialogContent, Button },
    setup() {
      const open = ref(true);
      return { open };
    },
    template: `
      <Dialog :open="open" @update:open="open = $event">
        <DialogContent class="max-w-md">
          <ConfirmDialog
            title="Save changes?"
            description="You have unsaved edits."
            confirm-label="Save"
            cancel-label="Discard"
            @confirm="open = false"
            @cancel="open = false"
          />
        </DialogContent>
      </Dialog>
    `,
  }),
};
