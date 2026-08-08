import Image from "next/image";

type BrandTone = "dark" | "light";

export function PathwayBrand({
  tone = "dark",
  compact = false,
  className = "",
  priority = false,
}: {
  tone?: BrandTone;
  compact?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const logoSrc = tone === "dark" ? "/brand/pathway-partners-white.png" : "/brand/pathway-partners-color.png";

  return (
    <div className={className} aria-label="PATHWAY Partners">
      <Image
        src={logoSrc}
        alt="PATHWAY Partners"
        width={1200}
        height={354}
        priority={priority}
        className={`h-auto object-contain ${compact ? "w-[92px]" : "w-[120px]"}`}
      />
    </div>
  );
}

export function PathwayCopyright({ tone = "dark", className = "" }: { tone?: BrandTone; className?: string }) {
  const dark = tone === "dark";

  return (
    <div className={`flex items-center gap-3 text-[11px] ${dark ? "text-slate-600" : "text-slate-400"} ${className}`}>
      <Image
        src={dark ? "/brand/pathway-partners-white.png" : "/brand/pathway-partners-color.png"}
        alt="PATHWAY Partners"
        width={1200}
        height={354}
        className={`h-auto w-[58px] shrink-0 object-contain ${dark ? "opacity-30" : "opacity-60"}`}
      />
      <span>Copyright © PATHWAY Partners Co., Ltd. All rights reserved.</span>
    </div>
  );
}
