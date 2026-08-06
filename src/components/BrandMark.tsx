import { cn } from "@/lib/utils";
import logoSolarAsset from "@/assets/logo-solar-v2.png.asset.json";

/** Logotipo da Usina dos Irmãos. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img 
      src={logoSolarAsset.url} 
      alt="Logo Usina dos Irmãos"
      className={cn("h-full w-full object-contain rounded-md", className)}
    />
  );
}

export function BrandLockup({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden bg-transparent">
        <BrandMark />
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="font-sans text-[15px] font-bold tracking-tight text-white text-glow">
            Usina dos Irmãos
          </div>
          <div className="text-[7px] font-semibold uppercase tracking-[0.22em] text-white/50 -mt-0.5">
            Gestão de energia
          </div>
        </div>
      )}
    </div>
  );
}
