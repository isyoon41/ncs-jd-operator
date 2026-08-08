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
  const primary = tone === "dark" ? "text-white" : "text-slate-900";
  const secondary = tone === "dark" ? "text-[#c5ab86]" : "text-[#806744]";
  const muted = tone === "dark" ? "text-slate-500" : "text-slate-400";

  return (
    <div className={`flex items-center ${compact ? "gap-2.5" : "gap-3.5"} ${className}`} aria-label="PATHWAY Partners">
      <span className={`grid shrink-0 place-items-center overflow-hidden rounded-lg bg-white ${compact ? "h-9 w-10 p-1" : "h-12 w-13 p-1.5"}`}>
        <Image
          src="/brand/pathway-partners-mark.png"
          alt=""
          width={294}
          height={268}
          priority={priority}
          className="h-full w-full object-contain"
        />
      </span>
      <span className="block leading-none">
        <span className={`block font-[Georgia,serif] font-bold tracking-[0.04em] ${compact ? "text-sm" : "text-xl"} ${primary}`}>
          PATHWAY
        </span>
        <span className={`mt-0.5 block font-[Georgia,serif] font-bold tracking-[0.08em] ${compact ? "text-xs" : "text-lg"} ${secondary}`}>
          PARTNERS
        </span>
        {!compact && (
          <span className={`mt-1.5 block text-[8px] font-semibold tracking-[0.16em] ${muted}`}>
            STRATEGIC CAPITAL MANAGEMENT
          </span>
        )}
      </span>
    </div>
  );
}

export function PathwayCopyright({ tone = "dark", className = "" }: { tone?: BrandTone; className?: string }) {
  const textColor = tone === "dark" ? "text-slate-500" : "text-slate-400";

  return (
    <div className={`flex items-center gap-2.5 text-[11px] ${textColor} ${className}`}>
      <span className="grid h-6 w-7 shrink-0 place-items-center overflow-hidden rounded bg-white p-0.5">
        <Image src="/brand/pathway-partners-mark.png" alt="" width={294} height={268} className="h-full w-full object-contain" />
      </span>
      <span>Copyright © PATHWAY Partners Co., Ltd. All rights reserved.</span>
    </div>
  );
}
