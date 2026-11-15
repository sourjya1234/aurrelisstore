const styles: [RegExp, string][] = [
  [/not interested/i, "bg-red-50 text-red-800 ring-red-200"],
  [/bounced|no_contact/i, "bg-stone-100 text-stone-700 ring-stone-300"],
  [/under discussion|sent/i, "bg-amber-50 text-amber-900 ring-amber-200"],
  [/to_send/i, "bg-sky-50 text-sky-900 ring-sky-200"],
  [/interested|won|closed|reviewed|replied/i, "bg-emerald-50 text-emerald-800 ring-emerald-200"],
];

export function StatusBadge({ status }: { status: string }) {
  const cls = styles.find(([re]) => re.test(status))?.[1] ?? "bg-sand text-ink ring-line";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
