interface PanchangRowProps {
  tithi?: string;
  nakshatra?: string;
  yoga?: string;
  karana?: string;
}

export function PanchangRow({ tithi, nakshatra, yoga, karana }: PanchangRowProps) {
  const items = [
    tithi && `Tithi: ${tithi}`,
    nakshatra && `Nakshatra: ${nakshatra}`,
    yoga && `Yoga: ${yoga}`,
    karana && `Karana: ${karana}`,
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((item, i) => (
        <span key={i} className="font-mono text-xs text-dust tracking-wide">
          {item}
        </span>
      ))}
    </div>
  );
}
