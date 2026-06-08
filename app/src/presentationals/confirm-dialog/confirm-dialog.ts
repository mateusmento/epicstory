import { type InjectionKey, type Ref, inject } from "vue";

export type ConfirmDialogOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use destructive styling for the primary action (e.g. delete). */
  destructive?: boolean;
};

export type ConfirmDialogContext = {
  /**
   * Opens the dialog with the given copy. Resolves `true` if the user confirms,
   * `false` if they cancel, dismiss via overlay, or close the dialog.
   * If a confirmation is already open, the previous promise resolves to `false`
   * before the new dialog is shown.
   */
  open: (options: ConfirmDialogOptions) => Promise<boolean>;
  /** Dismisses the dialog as cancelled (`false`) if a confirmation is pending; otherwise closes. */
  close: () => void;
  /** If the dialog is open, dismisses as cancelled; no-op when closed. */
  toggle: () => void;
  /** Whether the dialog is currently visible. */
  isOpen: Readonly<Ref<boolean>>;
};

export const CONFIRM_DIALOG_KEY: InjectionKey<ConfirmDialogContext> = Symbol("confirmDialog");

export function useConfirmDialog(): ConfirmDialogContext {
  const ctx = inject(CONFIRM_DIALOG_KEY);
  if (!ctx) {
    throw new Error("useConfirmDialog() must be used within ConfirmDialogProvider");
  }
  return ctx;
}
