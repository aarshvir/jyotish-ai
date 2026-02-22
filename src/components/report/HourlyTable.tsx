interface HourData {
  time: string;
  end_time: string;
  score: number;
  hora_planet: string;
  hora_planet_symbol?: string;
  choghadiya: string;
  choghadiya_quality?: string;
  transit_lagna?: string;
  transit_lagna_house?: number;
  is_rahu_kaal: boolean;
  commentary: string;
}

interface HourlyTableProps {
  hours: HourData[];
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mars: '♂',
  Mercury: '☿',
  Jupiter: '♃',
  Venus: '♀',
  Saturn: '♄',
};

const CHOGHADIYA_COLORS: Record<string, string> = {
  Amrit: 'text-emerald',
  Labh: 'text-emerald',
  Shubh: 'text-emerald',
  Chal: 'text-amber',
  Rog: 'text-crimson',
  Kaal: 'text-crimson',
  Udveg: 'text-crimson',
};

export function HourlyTable({ hours }: HourlyTableProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald';
    if (score >= 50) return 'text-amber';
    return 'text-crimson';
  };

  const getChoghadiyaBg = (choghadiya: string) => {
    if (['Amrit', 'Labh', 'Shubh'].includes(choghadiya)) return 'bg-emerald/10 border-emerald/20 text-emerald';
    if (choghadiya === 'Chal') return 'bg-amber/10 border-amber/20 text-amber';
    return 'bg-crimson/10 border-crimson/20 text-crimson';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-horizon">
            <th className="font-mono text-xs uppercase text-dust text-left py-3 px-4">
              Time
            </th>
            <th className="font-mono text-xs uppercase text-dust text-left py-3 px-4">
              Hora
            </th>
            <th className="font-mono text-xs uppercase text-dust text-left py-3 px-4">
              Choghadiya
            </th>
            <th className="font-mono text-xs uppercase text-dust text-left py-3 px-4 hidden lg:table-cell">
              Transit Lagna
            </th>
            <th className="font-mono text-xs uppercase text-dust text-center py-3 px-4">
              Score
            </th>
            <th className="font-mono text-xs uppercase text-dust text-left py-3 px-4 hidden md:table-cell">
              Commentary
            </th>
          </tr>
        </thead>
        <tbody>
          {hours.map((hour, i) => (
            <tr
              key={i}
              className={`hover:bg-nebula/40 transition-colors ${
                hour.is_rahu_kaal ? 'bg-crimson/5' : ''
              }`}
            >
              {/* Time */}
              <td className="font-mono text-sm text-star py-3 px-4 whitespace-nowrap">
                {hour.is_rahu_kaal && (
                  <span className="text-crimson mr-2">⚠</span>
                )}
                {hour.time}
              </td>

              {/* Hora Planet */}
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-amber">
                    {hour.hora_planet_symbol || PLANET_SYMBOLS[hour.hora_planet] || ''}
                  </span>
                  <span className="font-mono text-xs text-dust">
                    {hour.hora_planet}
                  </span>
                </div>
              </td>

              {/* Choghadiya */}
              <td className="py-3 px-4">
                <span className={`inline-flex items-center px-2 py-1 rounded-sm border font-mono text-xs ${getChoghadiyaBg(hour.choghadiya)}`}>
                  {hour.choghadiya}
                </span>
              </td>

              {/* Transit Lagna */}
              <td className="py-3 px-4 hidden lg:table-cell">
                {hour.transit_lagna && (
                  <span className="font-mono text-xs text-dust">
                    {hour.transit_lagna} ({hour.transit_lagna_house}H)
                  </span>
                )}
              </td>

              {/* Score */}
              <td className="py-3 px-4 text-center">
                <span
                  className={`font-mono text-lg font-bold ${getScoreColor(
                    hour.score
                  )}`}
                >
                  {hour.score}
                </span>
              </td>

              {/* Commentary */}
              <td className="py-3 px-4 hidden md:table-cell">
                <p className="font-display text-sm text-star italic max-w-[300px] line-clamp-3 leading-[1.6]">
                  {hour.commentary}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
