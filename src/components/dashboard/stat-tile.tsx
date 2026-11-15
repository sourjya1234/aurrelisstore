export function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="text-xs tracking-[0.15em] text-muted uppercase">{label}</p>
      <p className="mt-2 font-serif text-4xl tabular-nums">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
