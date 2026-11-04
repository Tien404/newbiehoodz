"use client";

import { useLayoutEffect } from "react";

/** Progressive enhancement: HTML stays visible until an entering element animates. */
export function ScrollReveal() {
  useLayoutEffect(() => {
    if (
      !("IntersectionObserver" in window) ||
      !("animate" in Element.prototype)
    )
      return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const seen = new WeakSet<HTMLElement>();

    const start = () => {
      if (preference.matches) return () => {};
      const running = new Map<HTMLElement, Animation>();
      const pending = new Set<HTMLElement>();
      let disposed = false;
      const reveal = (element: HTMLElement) => {
        if (element.contains(document.activeElement)) return;
        const group = element.closest("[data-reveal-group]");
        const peers = group
          ? [...group.querySelectorAll<HTMLElement>("[data-reveal]")].filter(
              (peer) => peer.closest("[data-reveal-group]") === group,
            )
          : [];
        const delay =
          element.dataset.reveal === "intro"
            ? 300
            : 180 + Math.min(Math.max(0, peers.indexOf(element)), 3) * 120;
        const animation = element.animate(
          [
            { opacity: 0, translate: "0 16px" },
            { opacity: 1, translate: "0 0" },
          ],
          {
            duration: 720,
            delay,
            easing: "cubic-bezier(.2,.7,.2,1)",
            fill: "backwards",
          },
        );
        running.set(element, animation);
        animation.onfinish = animation.oncancel = () => running.delete(element);
      };
      const observer = new IntersectionObserver(
        (entries) => {
          if (disposed) return;
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const element = entry.target as HTMLElement;
            observer.unobserve(element);
            pending.delete(element);
            reveal(element);
          }
        },
        { rootMargin: "0px 0px 24px 0px", threshold: 0 },
      );

      const register = (element: HTMLElement) => {
        if (seen.has(element)) return;
        seen.add(element);
        const bounds = element.getBoundingClientRect();
        // Skip content above a restored scroll position; reveal visible intros immediately.
        if (bounds.bottom <= 0 || element.contains(document.activeElement))
          return;
        if (bounds.top < window.innerHeight) {
          reveal(element);
          return;
        }
        pending.add(element);
        observer.observe(element);
      };
      const scan = (root: ParentNode) => {
        if (root instanceof HTMLElement && root.matches("[data-reveal]"))
          register(root);
        root.querySelectorAll<HTMLElement>("[data-reveal]").forEach(register);
      };
      scan(document);
      const mutations = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.removedNodes) {
            if (!(node instanceof HTMLElement)) continue;
            for (const element of pending) {
              if (node === element || node.contains(element)) {
                observer.unobserve(element);
                pending.delete(element);
              }
            }
          }
          for (const node of record.addedNodes)
            if (node instanceof HTMLElement) scan(node);
        }
      });
      mutations.observe(document.body, { childList: true, subtree: true });

      const onFocus = (event: FocusEvent) => {
        if (!(event.target instanceof Node)) return;
        for (const element of pending) {
          if (element.contains(event.target)) {
            observer.unobserve(element);
            pending.delete(element);
          }
        }
        for (const [element, animation] of running)
          if (element.contains(event.target)) animation.cancel();
      };
      document.addEventListener("focusin", onFocus);
      return () => {
        disposed = true;
        observer.disconnect();
        mutations.disconnect();
        document.removeEventListener("focusin", onFocus);
        for (const animation of running.values()) animation.cancel();
      };
    };

    let stop = start();
    const onPreferenceChange = () => {
      stop();
      stop = start();
    };
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      stop();
      preference.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return null;
}
