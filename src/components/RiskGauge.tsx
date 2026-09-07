import { BAND_STYLES, type RiskBand } from "@/lib/risk";

export function RiskGauge({ bdi, band }: { bdi: number; band: RiskBand }) {
  const pct = Math.round(bdi * 100);
  const style = BAND_STYLES[band];
  return (
    <div className="relative h-40 w-full">
      <svg viewBox="0 0 200 110" className="h-full w-full">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="currentColor" strokeWidth="18" className="text-muted" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="18"
          strokeDasharray={`${pct * 2.51} 251`}
          className={style.text}
        />
        <text x="100" y="95" textAnchor="middle" className="fill-foreground text-3xl font-bold tabular">
          {pct}
        </text>
        <text x="100" y="115" textAnchor="middle" className="fill-muted-foreground text-[10px] uppercase tracking-widest">
          BDI
        </text>
      </svg>
      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${style.chip}`}>
        {style.label}
      </div>
    </div>
  );
}
