import { useEffect, useRef } from "react";

/**
 * Minimal keyboard and focus behaviour for the app's dialogs (subject
 * sheet, project drawer). Appearance and functional behaviour are not
 * touched — this only adds, per dialog:
 *
 * - Escape closes the topmost open dialog;
 * - Tab (and Shift+Tab) is trapped inside the topmost dialog;
 * - focus moves to the dialog when it opens and is restored to the
 *   previously focused element when it closes.
 *
 * Dialogs can stack (the drawer can open above the subject sheet); only
 * the last-opened one reacts to the keyboard.
 */

const FOCUSABLE =
  'button:not([disabled]), select, input, textarea, a[href], [tabindex]:not([tabindex="-1"])';

type DialogController = { element: HTMLElement | null; close: () => void };

/** Open dialogs, oldest first. Module-level so stacked dialogs cooperate. */
const stack: DialogController[] = [];

export function useDialog(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(close);

  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (!open) return;

    const element = ref.current;
    const controller: DialogController = { element, close: () => closeRef.current() };
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    stack.push(controller);
    element?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== controller) return;

      if (event.key === "Escape") {
        event.preventDefault();
        controller.close();
        return;
      }

      if (event.key !== "Tab" || !element) return;

      const focusables = Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) => item.offsetParent !== null,
      );

      if (focusables.length === 0) {
        event.preventDefault();
        element.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !element.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !element.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      const index = stack.indexOf(controller);
      if (index >= 0) stack.splice(index, 1);
      previouslyFocused?.focus();
    };
  }, [open]);

  return ref;
}
