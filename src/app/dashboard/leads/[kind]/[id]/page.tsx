import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  FOLLOWUP_CHANNELS,
  getLeadDetail,
  isPipelineKind,
  LEAD_STATUSES,
  STATUS_DETAIL_SUGGESTIONS,
} from "@/lib/dashboard/outreach";
import { requireDashboardUser } from "@/lib/dashboard/session";
import { FollowupForm, LeadForm } from "./lead-forms";

export const metadata: Metadata = { title: "Lead" };

type Params = PageProps<"/dashboard/leads/[kind]/[id]">["params"];

export default function LeadPage({ params }: PageProps<"/dashboard/leads/[kind]/[id]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-sand" />}>
        <Lead params={params} />
      </Suspense>
    </div>
  );
}

const fmt = (iso: string | null, withTime = false) =>
  iso
    ? new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
        timeZone: "Asia/Kolkata",
      })
    : "—";

async function Lead({ params }: { params: Params }) {
  await requireDashboardUser();
  const { kind, id } = await params;
  if (!isPipelineKind(kind)) notFound();
  const lead = await getLeadDetail(kind, id);
  if (!lead) notFound();

  const back = `/dashboard?tab=${kind}`;
  const facts: [string, React.ReactNode][] = [
    [kind === "investors" ? "Investor type" : "Segment", lead.group ?? "—"],
    ["Country", lead.country ?? "—"],
    ["Email", lead.email ? <a href={`mailto:${lead.email}`} className="hover:text-gold-dark">{lead.email}</a> : "—"],
    ...(lead.phone ? [["Phone", <a key="p" href={`tel:${lead.phone}`}>{lead.phone}</a>] as [string, React.ReactNode]] : []),
    ...(lead.website
      ? [[
          "Website",
          <a
            key="w"
            href={/^https?:\/\//.test(lead.website) ? lead.website : `https://${lead.website}`}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-gold-dark"
          >
            {lead.website.replace(/^https?:\/\//, "")}
          </a>,
        ] as [string, React.ReactNode]]
      : []),
    ["Added", fmt(lead.createdAt)],
    ["Last updated", fmt(lead.updatedAt, true)],
  ];

  return (
    <>
      <Link href={back} className="text-sm text-muted hover:text-ink">
        ← {kind === "investors" ? "Investors" : "B2B partners"}
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl">{lead.name}</h1>
        <StatusBadge status={lead.status} />
      </div>
      {lead.statusDetail && <p className="mt-2 text-sm text-muted">{lead.statusDetail}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <dl className="grid gap-x-6 gap-y-4 rounded-xl border border-line p-5 sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="mt-0.5 text-sm break-words">{v}</dd>
              </div>
            ))}
            {lead.personalHook && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">Personal hook</dt>
                <dd className="mt-0.5 text-sm">{lead.personalHook}</dd>
              </div>
            )}
          </dl>

          <section className="rounded-xl border border-line p-5">
            <h2 className="font-serif text-2xl">Log a follow-up</h2>
            <div className="mt-4">
              <FollowupForm kind={kind} id={lead.id} statuses={LEAD_STATUSES} channels={FOLLOWUP_CHANNELS} />
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl">History</h2>
            <ol className="mt-4 space-y-4 border-l border-line pl-5">
              {lead.followups.map((f) => (
                <li key={f.id} className="relative">
                  <span className="absolute top-1.5 -left-[25px] h-2 w-2 rounded-full bg-gold-dark" aria-hidden />
                  <p className="text-xs text-muted">
                    {fmt(f.loggedAt, true)}
                    {f.channel && <> · <span className="capitalize">{f.channel}</span></>}
                    {f.by && <> · {f.by}</>}
                    {f.kind === "auto" && <> · automatic</>}
                  </p>
                  {f.note && <p className="mt-1 text-sm whitespace-pre-wrap">{f.note}</p>}
                  <p className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                    {f.statusAfter && <StatusBadge status={f.statusAfter} />}
                    {f.nextFollowup && <span>Next follow-up: {fmt(f.nextFollowup)}</span>}
                  </p>
                </li>
              ))}
              {lead.followups.length === 0 && <li className="text-sm text-muted">No follow-ups logged yet.</li>}
            </ol>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-line bg-ivory p-5 lg:sticky lg:top-6">
          <h2 className="font-serif text-2xl">Lead details</h2>
          <div className="mt-4">
            <LeadForm
              // Remount when the lead changes so the fields show the saved values.
              key={lead.updatedAt}
              kind={kind}
              id={lead.id}
              statuses={LEAD_STATUSES}
              detailSuggestions={STATUS_DETAIL_SUGGESTIONS}
              initial={{
                status: lead.status,
                statusDetail: lead.statusDetail ?? "",
                remark: lead.remark ?? "",
                spoc: lead.spoc ?? "",
              }}
            />
          </div>
        </aside>
      </div>
    </>
  );
}
