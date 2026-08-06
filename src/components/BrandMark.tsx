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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/10 p-1.5 shadow-[0_0_20px_rgba(255,255,255,0.15)] backdrop-blur-md">
        <BrandMark />
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="font-sans text-[13px] font-bold tracking-tight text-white text-glow">
            Usina dos Irmãos
          </div>
          <div className="text-[8px] font-semibold uppercase tracking-[0.22em] text-white/50">
            Gestão de energia
          </div>
        </div>
      )}
    </div>
  );
}
