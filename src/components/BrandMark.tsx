import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo-usina.png.asset.json";

/** Marca da Usina dos Irmãos: sol + painel solar. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img 
      src={logoAsset.url} 
      alt="Usina dos Irmãos" 
      className={cn("h-full w-full object-contain", className)} 
    />
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-white p-0.5 shadow-sm sm:h-11 sm:w-11">
        <BrandMark />
      </div>
      {!compact && (
        <div className="min-w-0 leading-none">
          <div className="font-display text-[15px] font-extrabold tracking-tight text-foreground">
            Usina <span className="text-primary">dos Irmãos</span>
          </div>
          <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Energia solar
          </div>
        </div>
      )}
    </div>
  );
}