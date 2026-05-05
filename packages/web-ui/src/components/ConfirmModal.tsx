/**
 * Generic confirm modal — Radix Dialog + danger-styled primary button.
 * Used for irreversible actions (purge mappings, delete workspace, etc.).
 *
 * Caller controls when `primaryDisabled` flips false — allowing it to gate
 * on a checkbox, a typed phrase, or any other multi-step condition.
 */
import * as Dialog from "@radix-ui/react-dialog";
import { type ReactNode } from "react";

export interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  primaryLabel: string;
  primaryDisabled: boolean;
  onPrimary: () => void;
  cancelLabel: string;
  testId?: string;
}

export function ConfirmModal(props: ConfirmModalProps): JSX.Element {
  const {
    open, onOpenChange, title, children,
    primaryLabel, primaryDisabled, onPrimary,
    cancelLabel, testId,
  } = props;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className="modal-content"
          data-testid={testId ?? "confirm-modal"}
        >
          <Dialog.Title className="modal-title">{title}</Dialog.Title>
          <Dialog.Description className="visually-hidden">{title}</Dialog.Description>
          <div className="modal-body">{children}</div>
          <div className="modal-actions">
            <Dialog.Close asChild>
              <button type="button" className="secondary" data-testid="confirm-cancel">
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              type="button"
              className="danger-solid"
              disabled={primaryDisabled}
              onClick={onPrimary}
              data-testid="confirm-primary"
            >
              {primaryLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
