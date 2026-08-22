import { Sparkles } from "lucide-react";

import { brand } from "@/lib/brand";

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3" aria-label={`${brand.name}, ${brand.eyebrow}`}>
      <span className="brand-gem" aria-hidden="true">
        <Sparkles size={compact ? 15 : 18} strokeWidth={1.8} />
      </span>
      <span className="leading-none">
        <span className="block text-[0.98rem] font-semibold tracking-[0.26em] text-white">
          {brand.name.toUpperCase()}
        </span>
        {!compact ? (
          <span className="mt-1 block text-[0.58rem] font-medium uppercase tracking-[0.2em] text-white/42">
            {brand.eyebrow}
          </span>
        ) : null}
      </span>
    </div>
  );
}
