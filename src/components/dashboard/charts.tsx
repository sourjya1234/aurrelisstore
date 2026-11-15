/**
 * Small, dependency-free charts for the ops dashboard.
 * Single series, one hue (gold-dark), recessive axes, hover tooltips per mark,
 * and an accessible table fallback for screen readers.
 */

const fmtDay = (ymd: string) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** Vertical bars, one per day. */
export function DayBars({ title, data, unit }: { title: string; data: { day: string; count: number }[]; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <figure className="rounded-xl border border-line bg-white p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted tabular-nums">
          {total.toLocaleString("en-IN")} {unit} in 30 days
        </span>
      </figcaption>
      <div className="mt-4 flex h-32 items-end gap-[2px] border-b border-line" aria-hidden>
        {data.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[4px] bg-gold-dark transition group-hover:bg-ink"
              style={{ height: d.count ? `${Math.max(3, (d.count / max) * 100)}%` : 0 }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-[11px] whitespace-nowrap text-ivory group-hover:block">
              {fmtDay(d.day)}: {d.count} {unit}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted" aria-hidden>
        <span>{data[0] && fmtDay(data[0].day)}</span>
        <span>Today</span>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>{unit}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal bars with the label and value as text (works as its own table). */
export function BarList({
  title,
  items,
  limit = 8,
}: {
  title: string;
  items: { label: string; count: number; href?: string }[];
  limit?: number;
}) {
  const shown = items.slice(0, limit);
  const rest = items.slice(limit).reduce((s, i) => s + i.count, 0);
  const rows = rest ? [...shown, { label: `Other (${items.length - limit})`, count: rest }] : shown;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="text-sm">
            <div className="flex justify-between gap-3">
              {"href" in r && r.href ? (
                <a href={r.href} className="truncate hover:text-gold-dark hover:underline">
                  {r.label}
                </a>
              ) : (
                <span className="truncate">{r.label}</span>
              )}
              <span className="text-muted tabular-nums">{r.count.toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-sand" aria-hidden>
              <div className="h-full rounded-full bg-gold-dark" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-muted">No data yet.</li>}
      </ul>
    </div>
  );
}
