import { cn } from "@/lib/utils";

/** Marca minimalista: ícone de sol em traço único, cor #C98A3E. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="#C98A3E" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={cn("h-6 w-6", className)}
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] bg-white p-1">
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
