import { Crosshair } from "lucide-react";

import { brand } from "@/lib/brand";

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-2.5" aria-label={`${brand.name}, ${brand.eyebrow}`}>
      <span className="brand-gem" aria-hidden="true">
        <Crosshair size={compact ? 15 : 18} strokeWidth={1.9} />
      </span>
      <span className="min-w-0 leading-none">
        <span className="block whitespace-nowrap text-[0.78rem] font-black tracking-[0.12em] text-white sm:text-[0.9rem] sm:tracking-[0.16em]">
          {compact ? brand.shortName : brand.name.toUpperCase()}
        </span>
        {!compact ? (
          <span className="mt-1 hidden text-[0.52rem] font-medium uppercase tracking-[0.15em] text-white/42 sm:block">
            {brand.eyebrow}
          </span>
        ) : null}
      </span>
    </div>
  );
}
