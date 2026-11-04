import Image from "next/image";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      className={`brand-logo ${className}`}
      src="/brand/logo.png"
      alt="Newbiehood"
      width={187}
      height={93}
    />
  );
}
