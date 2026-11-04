import type { ComponentProps } from "react";

type ContainerProps = ComponentProps<"div"> & {
  variant: "home" | "cheatsheet";
};

export function Container({
  variant,
  className = "",
  ...props
}: ContainerProps) {
  return (
    <div
      className={`content-container content-container--${variant} ${className}`}
      {...props}
    />
  );
}
