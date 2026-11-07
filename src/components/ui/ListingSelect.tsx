"use client";

import { useEffect, useId, useRef, useState } from "react";

type ListingOption<T> = { value: T; label: string };
type ListingOptionGroup<T> = {
  label: string;
  options: readonly ListingOption<T>[];
};

function positionOptions(trigger: HTMLButtonElement, menu: HTMLDivElement) {
  const anchor = trigger.getBoundingClientRect();
  const { clientWidth, clientHeight } = document.documentElement;
  const gutter = 8;
  const width = Math.min(Math.max(anchor.width, 224), clientWidth - 2 * gutter);
  const below = clientHeight - anchor.bottom - 2 * gutter;
  const above = anchor.top - 2 * gutter;
  const openAbove = below < 240 && above > below;

  menu.style.width = `${width}px`;
  menu.style.left = `${Math.max(gutter, Math.min(anchor.left, clientWidth - width - gutter))}px`;
  menu.style.top = openAbove ? "auto" : `${anchor.bottom + gutter}px`;
  menu.style.bottom = openAbove
    ? `${clientHeight - anchor.top + gutter}px`
    : "auto";
  menu.style.maxHeight = `${Math.max(0, Math.min(320, openAbove ? above : below))}px`;
}

export function ListingSelect<T extends string>({
  className = "",
  label,
  value,
  options,
  onChange,
}: {
  className?: string;
  label: string;
  value: T;
  options: readonly (ListingOption<T> | ListingOptionGroup<T>)[];
  onChange: (value: T) => void;
}) {
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options
    .flatMap((option) => ("options" in option ? option.options : [option]))
    .find((option) => option.value === value);

  function renderOption(option: ListingOption<T>) {
    return (
      <button
        key={option.value}
        type="button"
        role="option"
        aria-selected={option.value === value}
        tabIndex={-1}
        onClick={() => {
          onChange(option.value);
          menu.current?.hidePopover();
          trigger.current?.focus({ preventScroll: true });
        }}
      >
        {option.label}
      </button>
    );
  }

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (trigger.current && menu.current)
        positionOptions(trigger.current, menu.current);
    };
    window.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`listing-select ${className}`}
        popoverTarget={menuId}
        aria-label={`${label}: ${selected?.label ?? ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onKeyDown={(event) => {
          if (event.key === "Tab") menu.current?.hidePopover();
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            event.currentTarget.click();
          }
        }}
      >
        <span>{selected?.label}</span>
      </button>
      <div
        ref={menu}
        id={menuId}
        className="listing-select__options"
        popover="auto"
        role="listbox"
        aria-label={label}
        onBeforeToggle={(event) => {
          if (event.newState === "open" && trigger.current) {
            positionOptions(trigger.current, event.currentTarget);
          }
        }}
        onToggle={(event) => {
          const isOpen = event.newState === "open";
          setOpen(isOpen);
          if (isOpen) {
            const active = event.currentTarget.querySelector<HTMLButtonElement>(
              '[aria-selected="true"]',
            );
            active?.focus();
          }
        }}
        onKeyDown={(event) => {
          const list = event.currentTarget;
          if (event.key === "Tab") {
            // Let the browser move focus before dismissing the menu.
            requestAnimationFrame(() => list.hidePopover());
            return;
          }
          const buttons = Array.from(list.querySelectorAll("button"));
          const current = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          let next: HTMLButtonElement | undefined;
          switch (event.key) {
            case "ArrowDown":
              next = buttons[Math.min(current + 1, buttons.length - 1)];
              break;
            case "ArrowUp":
              next = buttons[Math.max(current - 1, 0)];
              break;
            case "Home":
              next = buttons[0];
              break;
            case "End":
              next = buttons.at(-1);
              break;
            default:
              if (
                event.key.length === 1 &&
                event.key !== " " &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey
              ) {
                next = [
                  ...buttons.slice(current + 1),
                  ...buttons.slice(0, current + 1),
                ].find((button) =>
                  button.textContent
                    .toLocaleLowerCase()
                    .startsWith(event.key.toLocaleLowerCase()),
                );
              }
          }
          if (next) {
            event.preventDefault();
            next.focus();
          }
        }}
      >
        <div className="listing-select__scroll" role="presentation">
          {options.map((option) =>
            "options" in option ? (
              <div key={option.label} role="group" aria-label={option.label}>
                <div className="listing-select__group-label" aria-hidden="true">
                  {option.label}
                </div>
                {option.options.map(renderOption)}
              </div>
            ) : (
              renderOption(option)
            ),
          )}
        </div>
      </div>
    </>
  );
}
