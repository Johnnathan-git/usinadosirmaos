import { cn } from "@/lib/utils";

/** Marca da Usina JJ: sol + painel solar. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label="Usina JJ" className={cn("h-full w-full", className)}>
      <defs>
        <linearGradient id="bm-sun" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD469" />
          <stop offset="100%" stopColor="#F0A93B" />
        </linearGradient>
        <linearGradient id="bm-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2A9C71" />
          <stop offset="100%" stopColor="#15694B" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="17" r="7.5" fill="url(#bm-sun)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <rect
          key={a}
          x="23.1"
          y="3"
          width="1.8"
          height="3.6"
          rx="0.9"
          fill="#FFD469"
          opacity="0.9"
          transform={`rotate(${a} 24 17)`}
        />
      ))}
      <path d="M13 43 L18.5 27.5 H29.5 L35 43 Z" fill="url(#bm-panel)" />
      <g stroke="#F7F5F0" strokeWidth="1" opacity="0.6">
        <path d="M17 38.5 H31" />
        <path d="M19 33 H29" />
        <path d="M24 27.5 V43" />
      </g>
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ink p-1.5 elev-2 sm:h-11 sm:w-11">
        <BrandMark />
      </div>
      {!compact && (
        <div className="min-w-0 leading-none">
          <div className="font-display text-[15px] font-extrabold tracking-tight text-foreground">
            Usina <span className="text-primary">JJ</span>
          </div>
          <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Energia solar
          </div>
        </div>
      )}
    </div>
  );
}