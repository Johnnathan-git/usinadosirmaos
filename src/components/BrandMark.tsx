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
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/50 bg-white p-1 shadow-sm">
        <BrandMark />
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="font-sans text-[15px] font-bold tracking-tight text-[#374151]">
            Usina dos Irmãos
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#4B5563]">
            Gestão de energia
          </div>
        </div>
      )}
    </div>
  );
}
