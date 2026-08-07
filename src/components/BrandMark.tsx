import { cn } from "@/lib/utils";
import usinaLogoAsset from "@/assets/usina-logo.png.asset.json";

/** Logotipo da Usina dos Irmãos. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img 
      src={usinaLogoAsset.url} 
      alt="Logo Usina dos Irmãos"
      className={cn("h-full w-full object-contain rounded-full", className)}
    />
  );
}

export function BrandLockup({ compact = false, onSidebar = false }: { compact?: boolean; onSidebar?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden bg-transparent">
        <div className="h-full w-full rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
          <span className="text-primary font-black text-lg">JT</span>
        </div>
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className={cn("font-sans text-[15px] font-bold tracking-tight text-foreground dark:text-glow", onSidebar && "light:text-white")}>
            Finanças John e Thais
          </div>
          <div className={cn("text-[7px] font-semibold uppercase tracking-[0.22em] text-muted-foreground -mt-0.5", onSidebar && "light:text-white/60")}>
            Gestão Familiar Autoral
          </div>
        </div>
      )}
    </div>
  );
}
