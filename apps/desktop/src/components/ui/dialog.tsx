import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DialogProps {
  open: boolean;
  /** Called for every exit route: the Cancel button, Escape, or a backdrop click. */
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * A modal built on the native `<dialog>` element.
 *
 * `showModal()` is why there is no dependency here: Chromium gives us the focus
 * trap, Escape-to-close, the `::backdrop` pseudo-element and top-layer stacking
 * for free. All this component does is keep the element in step with `open`.
 */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = ref.current;

    if (dialog === null) {
      return;
    }

    // Guarded both ways: calling showModal() on an open dialog throws, and
    // close() on a closed one would fire a spurious `close` event.
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;

    // One listener covers every exit. Escape and a backdrop click both fire
    // `cancel` then `close`, and the Cancel button closes by setting `open` to
    // false, which lands here too.
    const handleClose = () => {
      onClose();
    };

    dialog?.addEventListener("close", handleClose);

    return () => {
      dialog?.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      // Light dismiss: Chromium closes on a backdrop click, firing the same
      // `cancel`/`close` pair as Escape, so no click handler is needed. On a
      // renderer too old to know the attribute, Escape still closes it.
      closedby="any"
      className={cn(
        "m-auto w-full max-w-sm rounded-xl bg-card p-0 text-card-foreground shadow-xl",
        "backdrop:bg-foreground/25",
        className,
      )}
    >
      {open ? (
        <div className="flex flex-col gap-4 p-5">
          <DialogHeader id={headingId}>{title}</DialogHeader>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

export function DialogHeader({ className, children, ...props }: ComponentProps<"h2">) {
  return (
    <h2 className={cn("font-heading text-base font-medium", className)} {...props}>
      {children}
    </h2>
  );
}

export function DialogBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2 text-sm", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex justify-end gap-2", className)} {...props} />;
}
