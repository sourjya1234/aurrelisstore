import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BarList, DayBars } from "@/components/dashboard/charts";
import { StatTile } from "@/components/dashboard/stat-tile";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  getB2BPipeline,
  getInvestorPipeline,
  getReviewSummary,
  type Pipeline,
  type PipelineLead,
  type ReviewSummary,
} from "@/lib/dashboard/outreach";
import { requireDashboardUser, type DashboardUser } from "@/lib/dashboard/session";
import { logout, refreshOutreach } from "./actions";

export const metadata: Metadata = { title: "Outreach" };

type SP = Awaited<PageProps<"/dashboard">["searchParams"]>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "investors", label: "Investors" },
  { id: "b2b", label: "B2B partners" },
  { id: "reviews", label: "Review requests" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const PAGE_SIZE = 50;

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const user = await requireDashboardUser();
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.id === one(sp.tab))?.id ?? "overview") as Tab;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Outreach</p>
          <h1 className="mt-2 font-serif text-4xl">Pipeline dashboard</h1>
        </div>
        <UserBar user={user} />
      </div>

      <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-line" aria-label="Dashboard sections">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "overview" ? "/dashboard" : `/dashboard?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm transition ${
              tab === t.id ? "border-ink font-medium" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        {tab === "overview" && <Overview />}
        {tab === "investors" && <PipelineView pipeline={await getInvestorPipeline()} sp={sp} />}
        {tab === "b2b" && <PipelineView pipeline={await getB2BPipeline()} sp={sp} />}
        {tab === "reviews" && <ReviewsView summary={await getReviewSummary()} />}
      </div>
    </>
  );
}

function UserBar({ user }: { user: DashboardUser }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted">
        {user.name ?? user.email} · <span className="capitalize">{user.role}</span>
      </span>
      <form action={refreshOutreach}>
        <button className="rounded-full border border-line px-3 py-1.5 hover:border-ink" type="submit">
          Refresh data
        </button>
      </form>
      <form action={logout}>
        <button className="rounded-full border border-line px-3 py-1.5 hover:border-ink" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}

/* ---------------------------------- Overview ---------------------------------- */

async function Overview() {
  const [investors, b2b, reviews] = await Promise.all([getInvestorPipeline(), getB2BPipeline(), getReviewSummary()]);
  const active = (p: Pipeline) => p.statusCounts.find((s) => /under discussion/i.test(s.status))?.count ?? 0;

  return (
    <div className="space-y-10">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Investors"
          href="/dashboard?tab=investors"
          lines={[
            ["Contacts", investors.leads.length],
            ["Under discussion", active(investors)],
            ["Follow-ups (7 days)", investors.followupsLast7],
            ["Follow-ups due", investors.dueFollowups],
          ]}
        />
        <SummaryCard
          title="B2B partners"
          href="/dashboard?tab=b2b"
          lines={[
            ["Companies", b2b.leads.length],
            ["Under discussion", active(b2b)],
            ["Follow-ups (7 days)", b2b.followupsLast7],
            ["Follow-ups due", b2b.dueFollowups],
          ]}
        />
        <SummaryCard
          title="Review requests"
          href="/dashboard?tab=reviews"
          lines={[
            ["Customers", reviews.total],
            ["Sent", reviews.sent],
            ["Sent (7 days)", reviews.sentLast7],
            ["Reviews received", reviews.reviewed],
          ]}
        />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <DayBars title="Investor follow-ups" data={investors.followupsByDay} unit="follow-ups" />
        <DayBars title="B2B follow-ups" data={b2b.followupsByDay} unit="follow-ups" />
        <DayBars title="Review requests sent" data={reviews.sentByDay} unit="sent" />
      </section>
    </div>
  );
}

function SummaryCard({ title, href, lines }: { title: string; href: string; lines: [string, number][] }) {
  return (
    <Link href={href} className="group block rounded-xl border border-line bg-white p-5 transition hover:border-gold">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl">{title}</h2>
        <span className="text-sm text-muted group-hover:text-gold-dark">Open →</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {lines.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-serif text-2xl tabular-nums">{value.toLocaleString("en-IN")}</dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}

/* -------------------------------- Pipelines -------------------------------- */

const SORTS = [
  { id: "recent", label: "Recently updated" },
  { id: "due", label: "Next follow-up" },
  { id: "last", label: "Last follow-up" },
  { id: "name", label: "Name" },
] as const;

function filterLeads(leads: PipelineLead[], sp: SP) {
  const q = one(sp.q).trim().toLowerCase();
  const status = one(sp.status);
  const group = one(sp.group);
  const sort = one(sp.sort) || "recent";
  let out = leads.filter(
    (l) =>
      (!status || l.status === status) &&
      (!group || (l.group ?? "Unspecified") === group) &&
      (!q ||
        [l.name, l.email, l.country, l.spoc, l.group, l.remark, l.website]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))),
  );
  out = [...out].sort((a, b) => {
    switch (sort) {
      case "due":
        return (a.nextFollowup ?? "9999").localeCompare(b.nextFollowup ?? "9999");
      case "last":
        return (b.lastFollowup?.loggedAt ?? "").localeCompare(a.lastFollowup?.loggedAt ?? "");
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });
  return out;
}

function hrefWith(sp: SP, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp) as [string, string | string[] | undefined][]) {
    const val = one(v);
    if (val) params.set(k, val);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v) params.set(k, v);
    else params.delete(k);
  }
  return `/dashboard?${params.toString()}`;
}

function PipelineView({ pipeline, sp }: { pipeline: Pipeline; sp: SP }) {
  const isInvestors = pipeline.kind === "investors";
  const groupLabel = isInvestors ? "Investor type" : "Segment";
  const filtered = filterLeads(pipeline.leads, sp);
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const active = pipeline.statusCounts.find((s) => /under discussion/i.test(s.status))?.count ?? 0;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label={isInvestors ? "Investors" : "Companies"} value={pipeline.leads.length} />
        <StatTile label="Under discussion" value={active} />
        <StatTile label="Follow-ups (7 days)" value={pipeline.followupsLast7} hint={`${pipeline.followupsLast30} in 30 days`} />
        <StatTile label="Follow-ups due" value={pipeline.dueFollowups} hint="Next follow-up date is today or earlier" />
        <StatTile label="Not followed up yet" value={pipeline.neverFollowedUp} hint="Open leads with no logged follow-up" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <DayBars title="Follow-ups logged" data={pipeline.followupsByDay} unit="follow-ups" />
        <BarList
          title="By status"
          items={pipeline.statusCounts.map((s) => ({
            label: s.status,
            count: s.count,
            href: hrefWith(sp, { status: s.status, page: undefined }),
          }))}
        />
        <BarList
          title={`By ${groupLabel.toLowerCase()}`}
          items={pipeline.groupCounts.map((g) => ({
            label: g.group,
            count: g.count,
            href: hrefWith(sp, { group: g.group, page: undefined }),
          }))}
        />
      </section>

      <section>
        <form method="get" action="/dashboard" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="tab" value={pipeline.kind} />
          <label className="grow text-xs text-muted">
            Search
            <input
              className="input mt-1 py-2"
              name="q"
              defaultValue={one(sp.q)}
              placeholder={`Name, email, country, ${isInvestors ? "remark" : "segment"}…`}
            />
          </label>
          <label className="text-xs text-muted">
            Status
            <select className="input mt-1 py-2" name="status" defaultValue={one(sp.status)}>
              <option value="">All</option>
              {pipeline.statusCounts.map((s) => (
                <option key={s.status} value={s.status}>
                  {s.status} ({s.count})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            {groupLabel}
            <select className="input mt-1 py-2" name="group" defaultValue={one(sp.group)}>
              <option value="">All</option>
              {pipeline.groupCounts.map((g) => (
                <option key={g.group} value={g.group}>
                  {g.group} ({g.count})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            Sort
            <select className="input mt-1 py-2" name="sort" defaultValue={one(sp.sort) || "recent"}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn py-2.5" type="submit">
            Apply
          </button>
          <Link href={`/dashboard?tab=${pipeline.kind}`} className="py-2.5 text-sm text-muted hover:text-ink">
            Clear
          </Link>
        </form>

        <p className="mt-4 text-sm text-muted">
          Showing {rows.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{(page - 1) * PAGE_SIZE + rows.length} of{" "}
          {filtered.length.toLocaleString("en-IN")}
        </p>

        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-ivory text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{isInvestors ? "Investor" : "Company"}</th>
                <th className="px-4 py-3 font-medium">{groupLabel}</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Follow-ups</th>
                <th className="px-4 py-3 font-medium">Last follow-up</th>
                <th className="px-4 py-3 font-medium">Next</th>
                <th className="px-4 py-3 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((l) => (
                <LeadRow key={l.id} lead={l} kind={pipeline.kind} />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted">
                    No matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={hrefWith(sp, { page: String(page - 1) })} className="hover:text-gold-dark">
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted">
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link href={hrefWith(sp, { page: String(page + 1) })} className="hover:text-gold-dark">
                Next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

const fmtDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : "—";

function LeadRow({ lead, kind }: { lead: PipelineLead; kind: Pipeline["kind"] }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const overdue = lead.nextFollowup && lead.nextFollowup <= today;
  return (
    <tr className="align-top hover:bg-ivory/60">
      <td className="max-w-[260px] px-4 py-3">
        <Link href={`/dashboard/leads/${kind}/${lead.id}`} className="font-medium hover:text-gold-dark hover:underline">
          {lead.name}
        </Link>
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="block truncate text-xs text-muted hover:text-gold-dark">
            {lead.email}
          </a>
        )}
        {lead.website && (
          <a
            href={/^https?:\/\//.test(lead.website) ? lead.website : `https://${lead.website}`}
            target="_blank"
            rel="noreferrer noopener"
            className="block truncate text-xs text-muted hover:text-gold-dark"
          >
            {lead.website.replace(/^https?:\/\//, "")}
          </a>
        )}
      </td>
      <td className="px-4 py-3 text-muted">{lead.group ?? "—"}</td>
      <td className="px-4 py-3 text-muted">{lead.country ?? "—"}</td>
      <td className="px-4 py-3">
        <StatusBadge status={lead.status} />
        {lead.statusDetail && <p className="mt-1 max-w-[200px] text-xs text-muted">{lead.statusDetail}</p>}
      </td>
      <td className="px-4 py-3 tabular-nums">{lead.followupCount}</td>
      <td className="max-w-[280px] px-4 py-3">
        {lead.lastFollowup ? (
          <>
            <p>
              {fmtDate(lead.lastFollowup.loggedAt)}
              {lead.lastFollowup.channel && <span className="text-muted"> · {lead.lastFollowup.channel}</span>}
            </p>
            {lead.lastFollowup.note && (
              <p className="line-clamp-2 text-xs text-muted" title={lead.lastFollowup.note}>
                {lead.lastFollowup.note}
              </p>
            )}
          </>
        ) : (
          <span className="text-muted">None yet</span>
        )}
      </td>
      <td className={`px-4 py-3 whitespace-nowrap ${overdue ? "font-medium text-red-700" : "text-muted"}`}>
        {overdue && <span aria-label="Overdue">⚠ </span>}
        {fmtDate(lead.nextFollowup)}
      </td>
      <td className="px-4 py-3 text-muted">{lead.spoc ?? lead.lastFollowup?.by ?? "—"}</td>
    </tr>
  );
}

/* --------------------------------- Reviews --------------------------------- */

function ReviewsView({ summary }: { summary: ReviewSummary }) {
  const pct = (n: number) => (summary.sent ? `${Math.round((n / summary.sent) * 100)}% of sent` : undefined);
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Customers" value={summary.total} />
        <StatTile label="Requests sent" value={summary.sent} hint={`${summary.sentLast7} in the last 7 days`} />
        <StatTile label="Reviews received" value={summary.reviewed} hint={pct(summary.reviewed)} />
        <StatTile label="Replies" value={summary.replied} hint={pct(summary.replied)} />
        <StatTile
          label="Average rating"
          value={summary.averageRating ? summary.averageRating.toFixed(1) : "—"}
          hint={`${summary.bounced} bounced · ${summary.remindersSent} reminders`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <DayBars title="Requests sent" data={summary.sentByDay} unit="sent" />
        <BarList title="By status" items={summary.statusCounts.map((s) => ({ label: s.status.replace(/_/g, " "), count: s.count }))} />
        <BarList title="Sent via" items={summary.channelCounts.map((c) => ({ label: c.channel, count: c.count }))} />
      </section>

      <section>
        <h2 className="font-serif text-2xl">Recently sent</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-ivory text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sent</th>
                <th className="px-4 py-3 font-medium">Via</th>
                <th className="px-4 py-3 font-medium">By</th>
                <th className="px-4 py-3 font-medium">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {summary.recent.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.name ?? "—"}</p>
                    {r.company && <p className="text-xs text-muted">{r.company}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">{fmtDate(r.sentAt)}</td>
                  <td className="px-4 py-3 text-muted">{r.sentVia ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{r.sentBy ?? "—"}</td>
                  <td className="px-4 py-3">{r.rating ? "★".repeat(r.rating) : "—"}</td>
                </tr>
              ))}
              {summary.recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    Nothing sent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Loading dashboard">
      <div className="h-10 w-72 rounded bg-sand" />
      <div className="h-10 w-full rounded bg-sand" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 rounded-xl bg-sand" />
        ))}
      </div>
    </div>
  );
}
