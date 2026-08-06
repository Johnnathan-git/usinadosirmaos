import { cn } from "@/lib/utils";

/** Logotipo original da Usina dos Irmãos. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img 
      src="/__l5e/assets-v1/da8bdfcf-c4b9-440c-b782-4c211fe00bcb/logo-usina.png" 
      alt="Logo Usina dos Irmãos"
      className={cn("h-full w-full object-contain", className)}
    />
  );
}

export function BrandLockup({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white p-1 shadow-sm", dark ? "border-white/20" : "border-white/50")}>
        <BrandMark />
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className={cn("font-sans text-[15px] font-bold tracking-tight", dark ? "text-white" : "text-[#374151]")}>
            Usina dos Irmãos
          </div>
          <div className={cn("text-[10px] font-semibold uppercase tracking-[0.22em]", dark ? "text-white/60" : "text-[#4B5563]")}>
            Gestão de energia
          </div>
        </div>
      )}
    </div>
  );
}
