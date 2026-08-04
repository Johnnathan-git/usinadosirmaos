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
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#E4E7EC] bg-white p-1">
        <BrandMark />
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="font-sans text-[15px] font-bold tracking-tight text-[#1C2333]">
            Usina dos Irmãos
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">
            Gestão de Energia
          </div>
        </div>
      )}
    </div>
  );
}