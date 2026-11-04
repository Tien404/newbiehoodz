import Image from "next/image";

export function AboutArt({
  name,
  width,
  height,
  className = "",
}: {
  name: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <Image
      className={`about-art about-art--${name} ${className}`}
      src={`/about-us/${name}.webp`}
      width={width}
      height={height}
      alt=""
      aria-hidden="true"
    />
  );
}
