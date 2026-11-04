"use client";

import { useEffect, useId, useRef } from "react";
import "./text-disclosure.css";

/** Native popovers provide top-layer rendering, light dismissal and Escape support. */
export function TextDisclosure({
  text,
  label,
  className = "",
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dismiss = (event: Event) => {
      const panel = popover.current;
      // Keep long details scrollable without dismissing their own popover.
      if (event.target instanceof Node && panel?.contains(event.target)) return;
      if (panel?.matches(":popover-open")) panel.hidePopover();
    };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, []);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`text-disclosure-trigger ${className}`}
        popoverTarget={id}
        aria-haspopup="dialog"
      >
        <span>{text}</span>
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={label}
        tabIndex={-1}
        className="text-disclosure-popover"
        onToggle={(event) => {
          if (event.newState !== "open" || !trigger.current || !popover.current)
            return;
          const panel = popover.current;
          const anchor = trigger.current.getBoundingClientRect();
          const box = panel.getBoundingClientRect();
          const left = Math.max(
            16,
            Math.min(anchor.left, window.innerWidth - box.width - 16),
          );
          const below = anchor.bottom + 8;
          const top =
            below + box.height <= window.innerHeight - 16
              ? below
              : Math.max(16, anchor.top - box.height - 8);
          panel.style.left = `${left}px`;
          panel.style.top = `${top}px`;
          panel.focus({ preventScroll: true });
        }}
      >
        <p>{text}</p>
        <button
          type="button"
          className="text-disclosure-close"
          popoverTarget={id}
          popoverTargetAction="hide"
          aria-label={`Close ${label.toLowerCase()}`}
        >
          Close
        </button>
      </div>
    </>
  );
}
