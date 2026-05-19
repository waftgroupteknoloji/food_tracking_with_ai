'use client';

interface CalorieRingProps {
  kcalIn: number;
  kcalOut: number;
  target: number | null;
  size?: number;
}

export function CalorieRing({ kcalIn, kcalOut, target, size = 220 }: CalorieRingProps) {
  const stroke = 16;
  const radiusOuter = (size - stroke) / 2;
  const radiusInner = radiusOuter - stroke - 4;
  const circumferenceOuter = 2 * Math.PI * radiusOuter;
  const circumferenceInner = 2 * Math.PI * radiusInner;

  // Outer halka = kalori alım / hedef
  const targetVal = target ?? Math.max(kcalIn, 2000);
  const inPct = Math.min(kcalIn / targetVal, 1.25);

  // Inner halka = yakılan / hedef'in %30'u (görsel etki için)
  const outTarget = targetVal * 0.3;
  const outPct = Math.min(kcalOut / Math.max(outTarget, 1), 1.25);

  const net = kcalIn - kcalOut;
  const remaining = target ? target - net : null;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* outer track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radiusOuter}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={stroke}
        />
        {/* outer progress (kcalIn, green) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radiusOuter}
          fill="none"
          stroke="#16a34a"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumferenceOuter}
          strokeDashoffset={circumferenceOuter * (1 - inPct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* inner track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radiusInner}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={stroke}
        />
        {/* inner progress (kcalOut, orange) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radiusInner}
          fill="none"
          stroke="#f97316"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumferenceInner}
          strokeDashoffset={circumferenceInner * (1 - outPct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="-mt-[60%] flex flex-col items-center pointer-events-none">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Net</div>
        <div className="text-4xl font-bold">{net}</div>
        <div className="text-xs text-muted-foreground">kcal</div>
        {target && remaining !== null && (
          <div
            className={`mt-2 text-xs font-medium ${
              remaining >= 0 ? 'text-primary' : 'text-accent'
            }`}
          >
            {remaining >= 0
              ? `${remaining} kcal kaldı`
              : `${Math.abs(remaining)} kcal üzeri`}
          </div>
        )}
      </div>
    </div>
  );
}
